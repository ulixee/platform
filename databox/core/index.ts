import * as Os from 'os';
import * as Path from 'path';
import { promises as Fs } from 'fs';
import { NodeVM, VMScript } from 'vm2';
import IFunctionPluginCore from '@ulixee/databox/interfaces/IFunctionPluginCore';
import ConnectionToClient from '@ulixee/net/lib/ConnectionToClient';
import ITransportToClient from '@ulixee/net/interfaces/ITransportToClient';
import Logger from '@ulixee/commons/lib/Logger';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import ApiRegistry from '@ulixee/net/lib/ApiRegistry';
import { IDataboxApis } from '@ulixee/specification/databox';
import Databox, { Function } from '@ulixee/databox';
import IDataboxManifest from '@ulixee/specification/types/IDataboxManifest';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import IDataboxCoreConfigureOptions from './interfaces/IDataboxCoreConfigureOptions';
import env from './env';
import DataboxRegistry from './lib/DataboxRegistry';
import { unpackDbxFile } from './lib/dbxUtils';
import DataboxUpload from './endpoints/Databox.upload';
import WorkTracker from './lib/WorkTracker';
import DataboxExec from './endpoints/Databox.exec';
import IDataboxApiContext from './interfaces/IDataboxApiContext';
import DataboxRunLocalScript from './endpoints/Databox.execLocalScript';
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
    enableRunWithLocalPath: process.env.NODE_ENV !== 'production',
    paymentAddress: env.paymentAddress,
    giftCardsAllowed: env.giftCardsAllowed,
    giftCardsRequiredIssuerIdentity: env.giftCardsRequiredIssuerIdentity,
    uploaderIdentities: env.uploaderIdentities,
    computePricePerKb: env.computePricePerKb,
    defaultBytesForPaymentEstimates: 256,
    approvedSidechains: env.approvedSidechains,
    defaultSidechainHost: env.defaultSidechainHost,
    defaultSidechainRootIdentity: env.defaultSidechainRootIdentity,
    identityWithSidechain: env.identityWithSidechain,
    approvedSidechainsRefreshInterval: 60e3 * 60, // 1 hour
  };

  public static isClosing: Promise<void>;
  public static workTracker: WorkTracker;
  public static apiRegistry = new ApiRegistry<IDataboxApiContext>([
    DataboxUpload,
    DataboxExec,
    DataboxMeta,
  ]);

  static #vm: NodeVM;

  private static pluginCoresByName: { [name: string]: IFunctionPluginCore } = {};
  private static databoxRegistry: DataboxRegistry;
  private static sidechainClientManager: SidechainClientManager;
  private static isStarted = new Resolvable<void>();

  private static compiledScriptsByPath = new Map<string, Promise<VMScript>>();

  private static get vm(): NodeVM {
    if (!this.#vm) {
      const whitelist: Set<string> = new Set(
        ...Object.values(this.pluginCoresByName).map(x => x.nodeVmRequireWhitelist || []),
      );
      whitelist.add('@ulixee/*');

      this.#vm = new NodeVM({
        console: 'inherit',
        sandbox: {},
        wasm: false,
        eval: false,
        wrapper: 'commonjs',
        strict: true,
        require: {
          external: Array.from(whitelist),
        },
      });
    }

    return this.#vm;
  }

  public static addConnection(
    transport: ITransportToClient<IDataboxApis, never>,
  ): IDataboxConnectionToClient {
    const connection = this.apiRegistry.createConnection(
      transport,
      this.getApiContext(transport.remoteId),
    );
    connection.once('disconnected', () => this.connections.delete(connection));
    this.connections.add(connection);
    return connection;
  }

  public static registerPlugin(pluginCore: IFunctionPluginCore): void {
    this.pluginCoresByName[pluginCore.name] = pluginCore;
  }

  public static async start(): Promise<void> {
    if (this.isStarted.isResolved) return this.isStarted.promise;

    this.close = this.close.bind(this);
    if (!(await existsAsync(this.options.databoxesTmpDir))) {
      await Fs.mkdir(this.options.databoxesTmpDir, { recursive: true });
    }
    this.databoxRegistry = new DataboxRegistry(
      this.options.databoxesDir,
      this.options.databoxesTmpDir,
    );
    await this.installManuallyUploadedDbxFiles();

    process.env.ULX_DATABOX_DISABLE_AUTORUN = 'true';
    await new Promise(resolve => process.nextTick(resolve));

    for (const plugin of Object.values(this.pluginCoresByName)) {
      if (plugin.onCoreStart) await plugin.onCoreStart();
    }

    this.workTracker = new WorkTracker(this.options.maxRuntimeMs);

    if (this.options.enableRunWithLocalPath) {
      this.apiRegistry.register(DataboxRunLocalScript);
    }
    this.sidechainClientManager = new SidechainClientManager(this.options);
    this.isStarted.resolve();
  }

  public static async execDataboxFunction(
    path: string,
    functionName: string,
    manifest: IDataboxManifest,
    input: any,
  ): Promise<{ output: any }> {
    const script = await this.getVMScript(path, manifest);
    const databox = this.vm.run(script);

    let databoxFunction: Function = databox.functions?.[functionName];

    if (databox instanceof Function) {
      databoxFunction = databox;
    } else if (!(databox instanceof Databox)) {
      throw new Error(
        'The default export from this script needs to inherit from "@ulixee/databox"',
      );
    }

    if (!databoxFunction) {
      throw new Error(`${functionName} is not a valid Function name for this Databox.`)
    }

    const options = { input };
    for (const plugin of Object.values(this.pluginCoresByName)) {
      if (plugin.beforeExecFunction) await plugin.beforeExecFunction(options);
    }

    const output = await databoxFunction.exec(options);
    return { output };
  }

  public static async close(): Promise<void> {
    if (this.isClosing) return this.isClosing;
    const closingPromise = new Resolvable<void>();
    this.isClosing = closingPromise.promise;

    ShutdownHandler.unregister(this.close);

    this.compiledScriptsByPath.clear();

    try {
      await this.workTracker?.stop(this.options.waitForDataboxCompletionOnShutdown);

      for (const plugin of Object.values(this.pluginCoresByName)) {
        if (plugin.onCoreStart) await plugin.onCoreClose();
      }
      this.pluginCoresByName = {};

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

  private static getVMScript(path: string, manifest: IDataboxManifest): Promise<VMScript> {
    if (this.compiledScriptsByPath.has(path)) {
      return this.compiledScriptsByPath.get(path);
    }

    const script = new Promise<VMScript>(async resolve => {
      const file = await Fs.readFile(path, 'utf8');
      const vmScript = new VMScript(file, {
        filename: manifest.scriptEntrypoint,
      }).compile();
      resolve(vmScript);
    });

    this.compiledScriptsByPath.set(path, script);
    return script;
  }

  private static getApiContext(remoteId?: string): IDataboxApiContext {
    return {
      logger: log.createChild(module, { remoteId }),
      databoxRegistry: this.databoxRegistry,
      workTracker: this.workTracker,
      configuration: this.options,
      pluginCoresByName: this.pluginCoresByName,
      sidechainClientManager: this.sidechainClientManager,
      execDataboxFunction: this.execDataboxFunction.bind(this),
    };
  }
}
