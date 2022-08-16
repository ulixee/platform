import IDataboxCoreRuntime from '@ulixee/databox-interfaces/IDataboxCoreRuntime';
import ConnectionToClient from '@ulixee/net/lib/ConnectionToClient';
import ITransportToClient from '@ulixee/net/interfaces/ITransportToClient';
import Logger from '@ulixee/commons/lib/Logger';
import { promises as Fs } from 'fs';
import * as Path from 'path';
import * as Os from 'os';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import ApiRouter from '@ulixee/specification/utils/ApiRouter';
import DataboxApiSchemas, { IDataboxApis } from '@ulixee/specification/databox';
import IDataboxCoreConfigureOptions from '@ulixee/databox-interfaces/IDataboxCoreConfigureOptions';
import env from './env';
import DataboxRegistry from './lib/DataboxRegistry';
import { unpackDbxFile } from './lib/dbxUtils';
import DataboxUpload from './endpoints/Databox.upload';
import WorkTracker from './lib/WorkTracker';
import DataboxRun from './endpoints/Databox.run';
import IDataboxApiContext from './interfaces/IDataboxApiContext';
import DataboxRunLocalScript from './endpoints/Databox.runLocalScript';
import SidechainClientManager from './lib/SidechainClientManager';
import DataboxMeta from './endpoints/Databox.meta';

const { log } = Logger(module);

type IDataboxConnectionToClient = ConnectionToClient<IDataboxApis, never, IDataboxApiContext>;

export default class DataboxCore {
  public static connections = new Set<IDataboxConnectionToClient>();
  public static get databoxesDir(): string {
    return this.options.databoxesDir;
  }

  // SETTINGS
  public static options: IDataboxCoreConfigureOptions = {
    databoxesDir: env.databoxesDir,
    databoxesTmpDir: Path.join(Os.tmpdir(), '.ulixee', 'databox'),
    maxRuntimeMs: 10 * 60e3,
    waitForDataboxCompletionOnShutdown: false,
    enableRunWithLocalPath: true,
    paymentAddress: env.paymentAddress,
    giftCardAddress: env.giftCardAddress,
    uploaderIdentities: env.uploaderIdentities,
    computePricePerKb: env.computePricePerKb ?? 0,
    defaultBytesForPaymentEstimates: 256,
    approvedSidechains: env.approvedSidechains ?? [],
    defaultSidechainHost: env.defaultSidechainHost ?? 'https://greased-argon.com',
    defaultSidechainRootIdentity: env.defaultSidechainRootIdentity,
    identityWithSidechain: env.identityWithSidechain,
    approvedSidechainsRefreshInterval: 60e3 * 60, // 1 hour
  };

  public static isClosing: Promise<void>;
  public static workTracker: WorkTracker;
  public static apiRouter: ApiRouter<typeof DataboxApiSchemas, IDataboxApis> = new ApiRouter(
    DataboxApiSchemas,
    [DataboxUpload, DataboxRun, DataboxMeta],
  );

  private static coreRuntimesByName: { [name: string]: IDataboxCoreRuntime } = {};
  private static databoxRegistry: DataboxRegistry;
  private static sidechainClientManager: SidechainClientManager;

  private static isStarted = new Resolvable<void>();

  public static addConnection(
    transport: ITransportToClient<IDataboxApis, never>,
  ): IDataboxConnectionToClient {
    const connection = new ConnectionToClient(transport, this.apiRouter.handlers);
    connection.handlerMetadata = this.getApiContext(transport.remoteId);

    connection.once('disconnected', () => this.connections.delete(connection));
    this.connections.add(connection);
    return connection;
  }

  public static registerRuntime(coreRuntime: IDataboxCoreRuntime): void {
    this.coreRuntimesByName[coreRuntime.databoxRuntimeName] = coreRuntime;
  }

  public static async start(): Promise<void> {
    if (this.isStarted.isResolved) return this.isStarted.promise;

    if (!(await existsAsync(this.options.databoxesTmpDir))) {
      await Fs.mkdir(this.options.databoxesTmpDir, { recursive: true });
    }
    this.databoxRegistry = new DataboxRegistry(
      this.options.databoxesDir,
      this.options.databoxesTmpDir,
    );
    await this.installManuallyUploadedDbxFiles();

    for (const runner of Object.values(this.coreRuntimesByName)) {
      await runner.start(this.options.databoxesDir);
    }
    this.workTracker = new WorkTracker(this.options.maxRuntimeMs);

    if (this.options.enableRunWithLocalPath) {
      this.apiRouter.register(DataboxRunLocalScript);
    }
    this.sidechainClientManager = new SidechainClientManager(this.options);

    this.isStarted.resolve();
  }

  public static async close(): Promise<void> {
    if (this.isClosing) return this.isClosing;
    const closingPromise = new Resolvable<void>();
    this.isClosing = closingPromise.promise;
    try {
      await this.workTracker.stop(this.options.waitForDataboxCompletionOnShutdown);

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

      if (file.includes('@')) {
        const hash = file.replace('.dbx', '').split('@').pop();
        if (this.databoxRegistry.hasVersionHash(hash)) continue;
      }

      log.info('Found unknown .dbx file in databoxes directory. Checking for import.', {
        file,
        sessionId: null,
      });

      const tmpDir = await Fs.mkdtemp(`${this.options.databoxesTmpDir}/`);
      await unpackDbxFile(path, tmpDir);
      const buffer = await Fs.readFile(path);
      const { dbxPath } = await this.databoxRegistry.save(tmpDir, buffer, true);
      if (dbxPath !== path) await Fs.unlink(path);
      if (await existsAsync(tmpDir)) await Fs.rm(tmpDir, { recursive: true });
    }
  }

  private static getApiContext(remoteId?: string): IDataboxApiContext {
    return {
      sidechainClientManager: this.sidechainClientManager,
      workTracker: this.workTracker,
      logger: log.createChild(module, { remoteId }),
      configuration: this.options,
      databoxRegistry: this.databoxRegistry,
      coreRuntimesByName: this.coreRuntimesByName,
    };
  }
}
