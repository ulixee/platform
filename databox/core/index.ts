import { IDataboxApis } from '@ulixee/databox-interfaces/IDataboxApis';
import IDataboxCoreRuntime from '@ulixee/databox-interfaces/IDataboxCoreRuntime';
import ConnectionToClient from '@ulixee/net/lib/ConnectionToClient';
import ITransportToClient from '@ulixee/net/interfaces/ITransportToClient';
import IDataboxManifest from '@ulixee/databox-interfaces/IDataboxManifest';
import Logger from '@ulixee/commons/lib/Logger';
import { promises as Fs } from 'fs';
import * as Path from 'path';
import * as Os from 'os';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import env from './env';
import PackageRegistry from './lib/PackageRegistry';
import LocalDataboxProcess from './lib/LocalDataboxProcess';
import { unpackDbx, unpackDbxFile } from './lib/dbxUtils';

const { log } = Logger(module);

type IDataboxConnectionToClient = ConnectionToClient<IDataboxApis, {}>;

export default class DataboxCore {
  public static connections = new Set<IDataboxConnectionToClient>();
  public static databoxesDir: string;
  public static databoxesTmpDir = Path.join(Os.tmpdir(), 'dbx-');
  public static maxRuntimeMs = 10 * 60e3; // 10 mins
  public static waitForDataboxCompletionOnShutdown = false;
  public static isClosing: Promise<void>;

  private static runPromises = new Set<Resolvable<{ output: any; latestVersionHash: string }>>();
  private static uploadPromises = new Set<Resolvable<void>>();

  private static coreRuntimesByName: { [name: string]: IDataboxCoreRuntime } = {};
  private static packageRegistry: PackageRegistry;
  private static apiHandlers: IDataboxApis = {
    'Databox.upload': DataboxCore.upload.bind(this),
    'Databox.run': DataboxCore.run.bind(this),
    'Databox.runLocalScript': DataboxCore.runLocalScript.bind(this),
  };

  public static addConnection(
    transport: ITransportToClient<IDataboxApis, {}>,
  ): IDataboxConnectionToClient {
    const connection = new ConnectionToClient(transport, this.apiHandlers);
    connection.once('disconnected', () => this.connections.delete(connection));
    this.connections.add(connection);
    return connection;
  }

  public static registerRuntime(coreRuntime: IDataboxCoreRuntime): void {
    this.coreRuntimesByName[coreRuntime.databoxRuntimeName] = coreRuntime;
  }

  public static async start(): Promise<void> {
    this.databoxesDir = env.databoxStorage;
    for (const runner of Object.values(this.coreRuntimesByName)) {
      await runner.start(this.databoxesDir);
    }
    await this.installManuallyUploadedDbxFiles();
  }

  public static async upload(
    compressedDatabox: Buffer,
    allowNewLinkedVersionHistory: boolean,
  ): Promise<void> {
    if (this.isClosing)
      throw new CanceledPromiseError('Server shutting down. Not accepting uploads.');

    const tmpDir = await Fs.mkdtemp(this.databoxesTmpDir);

    return await this.trackUpload(
      (async () => {
        try {
          await unpackDbx(compressedDatabox, tmpDir);
          await this.getPackageRegistry().save(tmpDir, allowNewLinkedVersionHistory);
          // shouldn't be here anymore, but just in case
        } finally {
          await Fs.rmdir(tmpDir).catch(() => null);
        }
      })(),
    );
  }

  public static async run(
    scriptHash: string,
    input?: any,
  ): Promise<{ output: any; latestVersionHash: string }> {
    if (this.isClosing)
      throw new CanceledPromiseError('Server shutting down. Not accepting new work');
    const packageRegistry = this.getPackageRegistry();
    const databox = packageRegistry.getByHash(scriptHash);
    const runner = this.coreRuntimesByName[databox.runtimeName];
    if (!runner) {
      throw new Error(`Server does not support required databox runtime: ${databox.runtimeName}`);
    }
    if (!runner.canSatisfyVersion(databox.runtimeVersion)) {
      throw new Error(
        `The current version of ${databox.runtimeName} (${runner.databoxRuntimeVersion}) is incompatible with this Databox version (${databox.runtimeVersion})`,
      );
    }

    const manifest: IDataboxManifest = {
      scriptEntrypoint: databox.scriptEntrypoint,
      versionHash: databox.versionHash,
      versionTimestamp: Date.now(),
      scriptHash: databox.scriptHash,
      runtimeVersion: databox.runtimeVersion,
      runtimeName: databox.runtimeName,
      linkedVersions: [],
    };

    return await this.trackRun(
      runner.run(databox.path, manifest, input),
      databox.latestVersionHash,
    );
  }

  public static async runLocalScript(scriptPath: string, input?: any): Promise<{ output: any, latestVersionHash: string }> {
    const databoxProcess = new LocalDataboxProcess(scriptPath);
    const runtime = await databoxProcess.fetchRuntime();
    const runner = this.coreRuntimesByName[runtime.name];
    if (!runner) {
      throw new Error(`Server does not support required databox runtime: ${runtime.name}`);
    }

    return this.trackRun(databoxProcess.run(input), null);
  }

  public static async close(): Promise<void> {
    if (this.isClosing) return this.isClosing;
    const closingPromise = new Resolvable<void>();
    this.isClosing = closingPromise.promise;
    try {
      if (!this.waitForDataboxCompletionOnShutdown) {
        for (const promise of this.runPromises) {
          promise.reject(new CanceledPromiseError('Shutting down Server'));
          this.runPromises.delete(promise);
        }
      } else {
        log.info('Waiting for completing of remaining Databox.runs', {
          count: this.runPromises.size,
          sessionId: null,
        });
        await Promise.all([...this.runPromises].map(x => x.promise.catch(err => err)));
      }

      await Promise.all([...this.uploadPromises].map(x => x.promise.catch(err => err)));

      for (const promise of this.uploadPromises) {
        promise.reject(new CanceledPromiseError('Shutting down Server'));
        this.uploadPromises.delete(promise);
      }

      for (const runner of Object.values(this.coreRuntimesByName)) {
        await runner.close();
      }
      this.coreRuntimesByName = {};

      for (const connection of this.connections) {
        await connection.disconnect();
      }
      this.connections.clear();
    } finally {
      closingPromise.resolve();
    }
  }

  public static async installManuallyUploadedDbxFiles(): Promise<void> {
    if (!(await existsAsync(this.databoxesDir))) return;
    for (const file of await Fs.readdir(this.databoxesDir)) {
      if (!file.endsWith('.dbx')) continue;
      const path = Path.join(this.databoxesDir, file);
      log.info('Found DBX file in databoxes directory. Checking for import.', {
        file,
        sessionId: null,
      });
      const tmpDir = await Fs.mkdtemp(this.databoxesTmpDir);
      try {
        await unpackDbxFile(path, tmpDir, true);
        await this.getPackageRegistry().save(tmpDir, false);
        await Fs.unlink(path);
        // shouldn't be here anymore, but just in case
      } finally {
        await Fs.rmdir(tmpDir).catch(() => null);
      }
    }
  }

  private static getPackageRegistry(): PackageRegistry {
    this.packageRegistry ??= new PackageRegistry(this.databoxesDir);
    return this.packageRegistry;
  }

  private static trackUpload(uploadPromise: Promise<void>): Promise<void> {
    const resolvable = new Resolvable<void>(30e3);
    this.uploadPromises.add(resolvable);

    void uploadPromise
      .then(resolvable.resolve)
      .catch(resolvable.reject)
      .finally(() => this.uploadPromises.delete(resolvable));
    return resolvable.promise;
  }

  private static trackRun(
    outputPromise: Promise<{ output: any }>,
    latestVersionHash: string,
  ): Promise<{ output: any; latestVersionHash: string }> {
    const resolvable = new Resolvable<{ output: any; latestVersionHash: string }>(
      this.maxRuntimeMs,
    );
    this.runPromises.add(resolvable);

    void outputPromise
      .then(({ output }) => resolvable.resolve({ output, latestVersionHash }))
      .catch(resolvable.reject)
      .finally(() => this.runPromises.delete(resolvable));

    return resolvable.promise;
  }
}
