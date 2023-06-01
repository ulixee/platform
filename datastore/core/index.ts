import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import Logger from '@ulixee/commons/lib/Logger';
import { filterUndefined } from '@ulixee/commons/lib/objectUtils';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import TypedEventEmitter from '@ulixee/commons/lib/TypedEventEmitter';
import Ed25519 from '@ulixee/crypto/lib/Ed25519';
import Identity from '@ulixee/crypto/lib/Identity';
import { ConnectionToDatastoreCore } from '@ulixee/datastore';
import IDatastoreEvents from '@ulixee/datastore/interfaces/IDatastoreEvents';
import type IExtractorPluginCore from '@ulixee/datastore/interfaces/IExtractorPluginCore';
import { ConnectionToCore } from '@ulixee/net';
import ITransportToClient from '@ulixee/net/interfaces/ITransportToClient';
import ApiRegistry from '@ulixee/net/lib/ApiRegistry';
import TransportBridge from '@ulixee/net/lib/TransportBridge';
import { IDatastoreApis, IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import { IServicesSetupApiTypes } from '@ulixee/platform-specification/services/SetupApis';
import { datastoreRegex } from '@ulixee/platform-specification/types/datastoreVersionHashValidation';
import IKad from '@ulixee/platform-specification/types/IKad';
import { promises as Fs } from 'fs';
import { IncomingMessage, ServerResponse } from 'http';
import * as Os from 'os';
import * as Path from 'path';
import DatastoreAdmin from './endpoints/Datastore.admin';
import DatastoreCreateStorageEngine from './endpoints/Datastore.createStorageEngine';
import DatastoreCreditsBalance from './endpoints/Datastore.creditsBalance';
import DatastoreCreditsIssued from './endpoints/Datastore.creditsIssued';
import DatastoreDownload from './endpoints/Datastore.download';
import DatastoreMeta from './endpoints/Datastore.meta';
import DatastoreQuery from './endpoints/Datastore.query';
import DatastoreQueryStorageEngine from './endpoints/Datastore.queryStorageEngine';
import DatastoreStart from './endpoints/Datastore.start';
import DatastoreStream from './endpoints/Datastore.stream';
import DatastoreUpload from './endpoints/Datastore.upload';
import DatastoresList from './endpoints/Datastores.list';
import DocpageRoutes from './endpoints/DocpageRoutes';
import HostedServicesEndpoints, {
  TConnectionToServicesClient,
  TServicesApis,
} from './endpoints/HostedServicesEndpoints';
import env from './env';
import IDatastoreApiContext from './interfaces/IDatastoreApiContext';
import IDatastoreConnectionToClient from './interfaces/IDatastoreConnectionToClient';
import IDatastoreCoreConfigureOptions from './interfaces/IDatastoreCoreConfigureOptions';
import DatastoreApiClients from './lib/DatastoreApiClients';
import DatastoreRegistry, { IDatastoreManifestWithRuntime } from './lib/DatastoreRegistry';
import { IDatastoreSourceDetails } from './lib/DatastoreRegistryDiskStore';
import DatastoreVm from './lib/DatastoreVm';
import { MissingRequiredSettingError } from './lib/errors';
import SidechainClientManager from './lib/SidechainClientManager';
import StatsTracker from './lib/StatsTracker';
import StorageEngineRegistry from './lib/StorageEngineRegistry';
import { translateStats } from './lib/translateDatastoreMetadata';
import WorkTracker from './lib/WorkTracker';

const { log } = Logger(module);

export default class DatastoreCore extends TypedEventEmitter<{
  new: {
    datastore: IDatastoreApiTypes['Datastore.meta']['result'];
    activity: 'started' | 'uploaded';
  };
  stats: Pick<IDatastoreApiTypes['Datastore.meta']['result'], 'stats' | 'versionHash'>;
  query: { versionHash: string };
  connection: { connection: IDatastoreConnectionToClient };
  stopped: { versionHash: string };
}> {
  public pluginCoresByName: { [name: string]: IExtractorPluginCore } = {};

  public connections = new Set<IDatastoreConnectionToClient>();

  public get datastoresDir(): string {
    return this.options.datastoresDir;
  }

  public get queryHeroSessionsDir(): string {
    return this.options.queryHeroSessionsDir;
  }

  // SETTINGS
  public readonly options: IDatastoreCoreConfigureOptions;

  public isClosing: Promise<void>;
  public workTracker: WorkTracker;

  public apiRegistry = new ApiRegistry<IDatastoreApiContext>([
    DatastoreQuery,
    DatastoreStream,
    DatastoresList,
    DatastoreAdmin,
    DatastoreCreditsBalance,
    DatastoreCreditsIssued,
    DatastoreStart,
    DatastoreMeta,
    DatastoreDownload,
    DatastoreUpload,
    DatastoreQueryStorageEngine,
    DatastoreCreateStorageEngine,
  ]);

  public datastoreRegistry: DatastoreRegistry;
  public statsTracker: StatsTracker;
  public storageEngineRegistry: StorageEngineRegistry;
  public sidechainClientManager: SidechainClientManager;
  public datastoreApiClients: DatastoreApiClients;
  public vm: DatastoreVm;

  private isStarted = new Resolvable<void>();
  private docPages: DocpageRoutes;
  private cloudNodeAddress: URL;
  private cloudNodeIdentity: Identity;
  private hostedServicesEndpoints: HostedServicesEndpoints;

  private connectionToThisCore: ConnectionToDatastoreCore;

  constructor(options: Partial<IDatastoreCoreConfigureOptions>, plugins?: IExtractorPluginCore[]) {
    super();
    this.options = {
      serverEnvironment: env.serverEnvironment as any,
      datastoresDir: env.datastoresDir,
      datastoresTmpDir: Path.join(Os.tmpdir(), '.ulixee', 'datastore'),
      maxRuntimeMs: 10 * 60e3,
      waitForDatastoreCompletionOnShutdown: true,
      enableDatastoreWatchMode: env.serverEnvironment === 'development',
      paymentAddress: env.paymentAddress,
      datastoresMustHaveOwnAdminIdentity: env.datastoresMustHaveOwnAdminIdentity,
      cloudAdminIdentities: env.cloudAdminIdentities,
      computePricePerQuery: env.computePricePerQuery,
      defaultBytesForPaymentEstimates: 256,
      approvedSidechains: env.approvedSidechains,
      defaultSidechainHost: env.defaultSidechainHost,
      defaultSidechainRootIdentity: env.defaultSidechainRootIdentity,
      identityWithSidechain: env.identityWithSidechain,
      approvedSidechainsRefreshInterval: 60e3 * 60, // 1 hour

      datastoreRegistryHost: env.datastoreRegistryHost,
      storageEngineHost: env.storageEngineHost,
      statsTrackerHost: env.statsTrackerHost,
      queryHeroSessionsDir: env.queryHeroSessionsDir,
      replayRegistryHost: env.replayRegistryHost,
      cloudType: 'private',
      ...(options ?? {}),
    };
    if (plugins)
      for (const pluginCore of plugins) {
        this.pluginCoresByName[pluginCore.name] = pluginCore;
      }
  }

  public addConnection(
    transport: ITransportToClient<IDatastoreApis, IDatastoreEvents>,
  ): IDatastoreConnectionToClient {
    const context = this.getApiContext(transport.remoteId);
    const connection: IDatastoreConnectionToClient = this.apiRegistry.createConnection(
      transport,
      context,
    );
    const logger = context.logger;
    connection.on('response', ({ response, request, metadata }) => {
      logger.info(`api/${request.command} (${request.messageId})`, {
        args: request.args?.[0],
        response: response.data,
        ...metadata,
      });
    });
    context.connectionToClient = connection;
    connection.once('disconnected', () => {
      this.connections.delete(connection);
    });
    this.emit('connection', { connection });
    this.connections.add(connection);
    return connection;
  }

  public addHostedServicesConnection(
    transport: ITransportToClient<TServicesApis, {}>,
  ): TConnectionToServicesClient {
    if (!this.hostedServicesEndpoints) {
      throw new Error('This CloudNode has not been configured to provide Services services.');
    }
    const context = this.getApiContext(transport.remoteId);
    const connection = this.hostedServicesEndpoints.addConnection(transport, context);

    for (const plugin of Object.values(this.pluginCoresByName)) {
      plugin.registerHostedServices?.(connection);
    }
    const logger = context.logger;
    connection.on('response', ({ response, request, metadata }) => {
      logger.info(`services/api/${request.command} (${request.messageId})`, {
        args: request.args?.[0],
        response: response.data,
        ...metadata,
      });
    });
    return connection;
  }

  public registerHttpRoutes(
    addHttpRoute: (
      route: string | RegExp,
      method: 'GET' | 'OPTIONS' | 'POST' | 'UPDATE' | 'DELETE',
      callbackFn: IHttpHandleFn,
    ) => any,
  ): void {
    addHttpRoute(/.*\/free-credits\/?\?crd[A-Za-z0-9_]{8}.*/, 'GET', (req, res) =>
      this.docPages.routeCreditsBalanceApi(req, res),
    );
    addHttpRoute(new RegExp(`/(${datastoreRegex.source})(.*)`), 'GET', (req, res, params) =>
      this.docPages.routeHttp(req, res, params),
    );
    addHttpRoute(/\/(.*)/, 'GET', (req, res) => this.docPages.routeHttpRoot(req, res));
    addHttpRoute('/', 'OPTIONS', (req, res) => this.docPages.routeOptionsRoot(req, res));
  }

  public async start(options: {
    nodeAddress: URL;
    hostedServicesAddress?: URL;
    cloudType?: 'public' | 'private';
    defaultServices?: IServicesSetupApiTypes['Services.getSetup']['result'];
    kad?: IKad;
    networkIdentity: Identity;
    getSystemCore: (name: 'heroCore' | 'datastoreCore' | 'desktopCore') => any;
    createConnectionToServiceHost: (host: string) => ConnectionToCore<any, any>; // create connection to a services host
  }): Promise<void> {
    if (this.isStarted.isResolved) return this.isStarted.promise;

    const {
      nodeAddress,
      networkIdentity,
      cloudType,
      defaultServices,
      hostedServicesAddress,
      createConnectionToServiceHost,
    } = options;
    if (defaultServices) {
      Object.assign(this.options, filterUndefined(defaultServices));
    }
    if (this.options.storageEngineHost === 'self') {
      this.options.storageEngineHost = nodeAddress.href;
    }

    if (hostedServicesAddress) {
      // if this node is hosting services, default hosts here
      const servicesHost = hostedServicesAddress?.href;
      // if there's a hosted services address, a storage engine host is required!
      //  -- otherwise, engine db could be on different host than datastore storage
      this.options.storageEngineHost ??= nodeAddress.href;

      // replace "self" if provided
      if (this.options.statsTrackerHost === 'self') this.options.statsTrackerHost = servicesHost;
      if (this.options.datastoreRegistryHost === 'self')
        this.options.datastoreRegistryHost = servicesHost;
      if (this.options.replayRegistryHost === 'self')
        this.options.replayRegistryHost = servicesHost;

      this.options.statsTrackerHost ??= servicesHost;
      this.options.datastoreRegistryHost ??= servicesHost;
      // start a services services provider
      this.hostedServicesEndpoints = new HostedServicesEndpoints();
    }

    const startLogId = log.info('DatastoreCore.start', {
      options: this.options,
      sessionId: null,
    });

    this.cloudNodeAddress = nodeAddress;
    this.cloudNodeIdentity = networkIdentity;
    if (cloudType) this.options.cloudType = cloudType;
    try {
      this.close = this.close.bind(this);

      if (
        this.options.serverEnvironment === 'production' &&
        !this.options.cloudAdminIdentities.length
      ) {
        this.showTemporaryAdminIdentityPrompt();
      }

      if (!(await existsAsync(this.options.datastoresTmpDir))) {
        await Fs.mkdir(this.options.datastoresTmpDir, { recursive: true });
      }
      if (!(await existsAsync(this.options.queryHeroSessionsDir))) {
        await Fs.mkdir(this.options.queryHeroSessionsDir, { recursive: true });
      }

      if (this.options.datastoreRegistryHost && !this.options.storageEngineHost) {
        throw new MissingRequiredSettingError(
          'DatastoreCore has been configured with a remote Datastore Registry, but no StorageEngineHost (ULX_STORAGE_ENGINE_HOST). Remote Datastores must have an IP addressable storage engine.',
          'storageEngineHost',
        );
      }

      const bridge = new TransportBridge();
      this.connectionToThisCore = new ConnectionToDatastoreCore(bridge.transportToCore);
      this.datastoreApiClients = new DatastoreApiClients();

      this.vm = new DatastoreVm(
        this.connectionToThisCore,
        this.datastoreApiClients,
        Object.values(this.pluginCoresByName),
      );

      this.storageEngineRegistry = new StorageEngineRegistry(
        this.options.datastoresDir,
        this.cloudNodeAddress,
      );

      this.statsTracker = new StatsTracker(
        this.options.datastoresDir,
        createConnectionToServiceHost(this.options.statsTrackerHost),
      );
      this.datastoreRegistry = new DatastoreRegistry(
        this.options.datastoresDir,
        this.datastoreApiClients,
        createConnectionToServiceHost(this.options.datastoreRegistryHost),
        options.kad,
        this.options,
        this.onDatastoreInstalled.bind(this),
      );
      this.docPages = new DocpageRoutes(this.datastoreRegistry, this.cloudNodeAddress, args =>
        DatastoreCreditsBalance.handler(args, this.getApiContext()),
      );
      await this.datastoreRegistry.diskStore.installOnDiskUploads(
        this.options.cloudAdminIdentities,
        this.cloudNodeAddress.host,
      );

      for (const plugin of Object.values(this.pluginCoresByName)) {
        await plugin.onCoreStart?.(this.options, {
          createConnectionToServiceHost,
          getSystemCore: options.getSystemCore,
        });
      }

      this.workTracker = new WorkTracker(this.options.maxRuntimeMs);

      this.sidechainClientManager = new SidechainClientManager(this.options);
      log.stats('DatastoreCore.started', {
        parentLogId: startLogId,
        sessionId: null,
      });
      this.isStarted.resolve();

      // must be started before we can register for events
      this.addConnection(bridge.transportToClient);
      this.datastoreRegistry.on('new', this.onNewDatastore.bind(this));
      this.statsTracker.on('stats', this.onDatastoreStats.bind(this));
      this.datastoreRegistry.on('stopped', this.onDatastoreStopped.bind(this));
    } catch (error) {
      log.stats('DatastoreCore.startError', {
        parentLogId: startLogId,
        error,
        sessionId: null,
      });
      this.isStarted.reject(error, true);
    }
    return this.isStarted;
  }

  public async copyDbxToStartDir(path: string): Promise<void> {
    const filename = Path.basename(path);
    const dest = Path.join(this.options.datastoresDir, filename);
    if (!(await existsAsync(dest))) {
      if (!(await existsAsync(this.options.datastoresDir))) {
        await Fs.mkdir(this.options.datastoresDir, { recursive: true });
      }
      await Fs.copyFile(path, dest);
    }
  }

  public async close(): Promise<void> {
    if (this.isClosing) return this.isClosing;
    const closingPromise = new Resolvable<void>();
    this.isClosing = closingPromise.promise;
    const logid = log.stats('DatastoreCore.Closing', {
      sessionId: null,
    });
    try {
      await this.workTracker?.stop(this.options.waitForDatastoreCompletionOnShutdown);

      for (const plugin of Object.values(this.pluginCoresByName)) {
        if (plugin.onCoreClose) await plugin.onCoreClose();
      }
      this.pluginCoresByName = {};

      for (const connection of this.connections) {
        await connection.disconnect();
      }
      this.connections.clear();
      await this.datastoreRegistry?.close();
      await this.storageEngineRegistry?.close();

      await this.datastoreApiClients?.close();

      closingPromise.resolve();
    } catch (error) {
      closingPromise.reject(error);
    } finally {
      log.stats('DatastoreCore.Closed', { parentLogId: logid, sessionId: null });
    }
  }

  private async onDatastoreInstalled(
    version: IDatastoreManifestWithRuntime,
    source: IDatastoreSourceDetails['source'],
    previous?: IDatastoreManifestWithRuntime,
    options?: {
      clearExisting?: boolean;
      isWatching?: boolean;
    },
  ): Promise<void> {
    if (source === 'cluster' || source === 'network') return;
    if (this.storageEngineRegistry.isHostingStorageEngine(version.storageEngineHost)) {
      await this.storageEngineRegistry.create(this.vm, version, previous, options);
    } else {
      const versionDbx = await this.datastoreRegistry.diskStore.getCompressedDbx(
        version.versionHash,
      );
      const previousDbx = await this.datastoreRegistry.diskStore.getCompressedDbx(
        previous?.versionHash,
      );
      await this.storageEngineRegistry.createRemote(version, versionDbx, previousDbx);
    }
  }

  private onNewDatastore(event: DatastoreRegistry['EventTypes']['new']): void {
    void DatastoreMeta.handler(
      { versionHash: event.datastore.versionHash },
      this.getApiContext(),
    ).then(x => {
      return this.emit('new', { activity: event.activity, datastore: x });
    });
  }

  private onDatastoreStopped(event: DatastoreRegistry['EventTypes']['stopped']): void {
    this.emit('stopped', event);
  }

  private onDatastoreStats(event: StatsTracker['EventTypes']['stats']): void {
    this.emit('stats', { versionHash: event.versionHash, stats: translateStats(event) });
  }

  private getApiContext(remoteId?: string): IDatastoreApiContext {
    if (!this.isStarted.isResolved) {
      throw new Error('DatastoreCore has not started');
    }
    return {
      logger: log.createChild(module, { remoteId }),
      datastoreRegistry: this.datastoreRegistry,
      workTracker: this.workTracker,
      configuration: this.options,
      pluginCoresByName: this.pluginCoresByName,
      sidechainClientManager: this.sidechainClientManager,
      storageEngineRegistry: this.storageEngineRegistry,
      cloudNodeAddress: this.cloudNodeAddress,
      cloudNodeIdentity: this.cloudNodeIdentity,
      vm: this.vm,
      datastoreApiClients: this.datastoreApiClients,
      statsTracker: this.statsTracker,
    };
  }

  private showTemporaryAdminIdentityPrompt(): void {
    const tempIdentity = Identity.createSync();
    this.options.cloudAdminIdentities.push(tempIdentity.bech32);
    const key = Ed25519.getPrivateKeyBytes(tempIdentity.privateKey);
    console.warn(`\n
############################################################################################
############################################################################################
###########################  TEMPORARY ADMIN IDENTITY  #####################################
############################################################################################
############################################################################################

            A temporary adminIdentity has been installed on your server. 

       To perform admin activities (like issuing Credits for a Datastore), you should 
                 save and use this Identity from your local system:

 npx @ulixee/crypto save-identity --privateKey=${key.toString('base64')}

--------------------------------------------------------------------------------------------
       
           To dismiss this message, add the following environment variable:
           
 ULX_CLOUD_ADMIN_IDENTITIES=${tempIdentity.bech32},

############################################################################################
############################################################################################
############################################################################################
\n\n`);
  }
}

type IHttpHandleFn = (
  req: IncomingMessage,
  res: ServerResponse,
  params: string[],
) => Promise<boolean | void>;
