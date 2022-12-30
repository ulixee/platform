import * as Os from 'os';
import * as Path from 'path';
import { promises as Fs } from 'fs';
import { IncomingMessage, ServerResponse } from 'http';
import * as Finalhandler from 'finalhandler';
import * as ServeStatic from 'serve-static';
import IFunctionPluginCore from '@ulixee/databox/interfaces/IFunctionPluginCore';
import ITransportToClient from '@ulixee/net/interfaces/ITransportToClient';
import Logger from '@ulixee/commons/lib/Logger';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import ApiRegistry from '@ulixee/net/lib/ApiRegistry';
import { IDataboxApis } from '@ulixee/specification/databox';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import IDataboxEvents from '@ulixee/databox/interfaces/IDataboxEvents';
import IDataboxCoreConfigureOptions from './interfaces/IDataboxCoreConfigureOptions';
import env from './env';
import DataboxRegistry from './lib/DataboxRegistry';
import { unpackDbxFile } from './lib/dbxUtils';
import WorkTracker from './lib/WorkTracker';
import IDataboxApiContext from './interfaces/IDataboxApiContext';
import SidechainClientManager from './lib/SidechainClientManager';
import DataboxUpload from './endpoints/Databox.upload';
import DataboxQuery from './endpoints/Databox.query';
import DataboxQueryLocalScript from './endpoints/Databox.queryLocalScript';
import DataboxMeta from './endpoints/Databox.meta';
import DataboxQueryInternal from './endpoints/Databox.queryInternal';
import DataboxQueryInternalTable from './endpoints/Databox.queryInternalTable';
import DataboxQueryInternalFunctionResult from './endpoints/Databox.queryInternalFunctionResult';
import DataboxInitializeInMemoryTable from './endpoints/Databox.createInMemoryTable';
import DataboxInitializeInMemoryFunction from './endpoints/Databox.createInMemoryFunction';
import IDataboxConnectionToClient from './interfaces/IDataboxConnectionToClient';
import DataboxStorage from './lib/DataboxStorage';
import DataboxStream from './endpoints/Databox.stream';

const { log } = Logger(module);

export default class DataboxCore {
  public static connections = new Set<IDataboxConnectionToClient>();
  public static get databoxesDir(): string {
    return this.options.databoxesDir;
  }

  // SETTINGS
  public static options: IDataboxCoreConfigureOptions = {
    serverEnvironment: env.serverEnvironment,
    databoxesDir: env.databoxesDir,
    databoxesTmpDir: Path.join(Os.tmpdir(), '.ulixee', 'databox'),
    maxRuntimeMs: 10 * 60e3,
    waitForDataboxCompletionOnShutdown: false,
    enableRunWithLocalPath: env.serverEnvironment === 'development',
    paymentAddress: env.paymentAddress,
    giftCardsAllowed: env.giftCardsAllowed,
    giftCardsRequiredIssuerIdentity: env.giftCardsRequiredIssuerIdentity,
    uploaderIdentities: env.uploaderIdentities,
    computePricePerQuery: env.computePricePerQuery,
    defaultBytesForPaymentEstimates: 256,
    approvedSidechains: env.approvedSidechains,
    defaultSidechainHost: env.defaultSidechainHost,
    defaultSidechainRootIdentity: env.defaultSidechainRootIdentity,
    identityWithSidechain: env.identityWithSidechain,
    approvedSidechainsRefreshInterval: 60e3 * 60, // 1 hour
  };

  public static pluginCoresByName: { [name: string]: IFunctionPluginCore } = {};
  public static isClosing: Promise<void>;
  public static workTracker: WorkTracker;
  public static apiRegistry = new ApiRegistry<IDataboxApiContext>([
    DataboxUpload,
    DataboxQuery,
    DataboxStream,
    DataboxMeta,
    DataboxQueryInternal,
    DataboxQueryInternalTable,
    DataboxQueryInternalFunctionResult,
    DataboxInitializeInMemoryTable,
    DataboxInitializeInMemoryFunction,
  ]);

  private static databoxRegistry: DataboxRegistry;
  private static sidechainClientManager: SidechainClientManager;
  private static isStarted = new Resolvable<void>();

  public static addConnection(
    transport: ITransportToClient<IDataboxApis, IDataboxEvents>,
  ): IDataboxConnectionToClient {
    const context = this.getApiContext(transport.remoteId);
    const connection: IDataboxConnectionToClient = this.apiRegistry.createConnection(transport, context);
    context.connectionToClient = connection;
    connection.once('disconnected', () => {
      connection.databoxStorage?.db.close();
      this.connections.delete(connection);
    });
    connection.isInternal = this.options.serverEnvironment === 'development';
    this.connections.add(connection);
    return connection;
  }

  public static async routeHttp(req: IncomingMessage, res: ServerResponse, params: string[]): Promise<void> {
    const pathParts = params[0].match(/([^/]+)(\/(.+)?)?/);
    const versionHash = pathParts[1];
    const reqPath = pathParts[3] ? pathParts[2] : '/index.html';
    const { registryEntry } = await this.databoxRegistry.loadVersion(versionHash);
    const docpagePath = registryEntry.path.replace(/databox.js$/, 'docpage');
    req.url = reqPath;
    const done = Finalhandler(req, res);
    ServeStatic(docpagePath)(req, res, done);
  }

  public static registerPlugin(pluginCore: IFunctionPluginCore): void {
    this.pluginCoresByName[pluginCore.name] = pluginCore;
  }

  public static async start(): Promise<void> {
    if (this.isStarted.isResolved) return this.isStarted.promise;

    this.close = this.close.bind(this);

    if (this.options.enableRunWithLocalPath) {
      this.apiRegistry.register(DataboxQueryLocalScript);
    }

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

    this.sidechainClientManager = new SidechainClientManager(this.options);
    this.isStarted.resolve();
  }

  public static async close(): Promise<void> {
    if (this.isClosing) return this.isClosing;
    const closingPromise = new Resolvable<void>();
    this.isClosing = closingPromise.promise;

    ShutdownHandler.unregister(this.close);

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
      this.databoxRegistry?.close();
      DataboxStorage.closeAll();
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
    if (!this.workTracker) {
      throw new Error('DataboxCore has not started')
    }
    return {
      logger: log.createChild(module, { remoteId }),
      databoxRegistry: this.databoxRegistry,
      workTracker: this.workTracker,
      configuration: this.options,
      pluginCoresByName: this.pluginCoresByName,
      sidechainClientManager: this.sidechainClientManager,
    };
  }
}
