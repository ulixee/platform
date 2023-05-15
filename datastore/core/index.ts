import Logger from '@ulixee/commons/lib/Logger';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import TypedEventEmitter from '@ulixee/commons/lib/TypedEventEmitter';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import { filterUndefined } from '@ulixee/commons/lib/objectUtils';
import { toUrl } from '@ulixee/commons/lib/utils';
import Ed25519 from '@ulixee/crypto/lib/Ed25519';
import Identity from '@ulixee/crypto/lib/Identity';
import { ConnectionToDatastoreCore } from '@ulixee/datastore';
import IDatastoreEvents from '@ulixee/datastore/interfaces/IDatastoreEvents';
import IExtractorPluginCore from '@ulixee/datastore/interfaces/IExtractorPluginCore';
import ITransportToClient from '@ulixee/net/interfaces/ITransportToClient';
import ApiRegistry from '@ulixee/net/lib/ApiRegistry';
import TransportBridge from '@ulixee/net/lib/TransportBridge';
import { IDatastoreApiTypes, IDatastoreApis } from '@ulixee/platform-specification/datastore';
import { IServicesSetupApiTypes } from '@ulixee/platform-specification/services/SetupApis';
import IPeerNetwork from '@ulixee/platform-specification/types/IPeerNetwork';
import { datastoreRegex } from '@ulixee/platform-specification/types/datastoreVersionHashValidation';
import { promises as Fs } from 'fs';
import { IncomingMessage, ServerResponse } from 'http';
import * as Os from 'os';
import * as Path from 'path';
import DatastoreAdmin from './endpoints/Datastore.admin';
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
import DatastoreRegistry from './lib/DatastoreRegistry';
import DatastoreVm from './lib/DatastoreVm';
import SidechainClientManager from './lib/SidechainClientManager';
import StatsTracker from './lib/StatsTracker';
import StorageEngineRegistry from './lib/StorageEngineRegistry';
import WorkTracker from './lib/WorkTracker';
import { translateStats } from './lib/translateDatastoreMetadata';

const { log } = Logger(module);

export default class DatastoreCore {
  public static connections = new Set<IDatastoreConnectionToClient>();
  public static events = new TypedEventEmitter<{
    new: {
      datastore: IDatastoreApiTypes['Datastore.meta']['result'];
      activity: 'started' | 'uploaded';
    };
    stats: Pick<IDatastoreApiTypes['Datastore.meta']['result'], 'stats' | 'versionHash'>;
    query: { versionHash: string };
    connection: { connection: IDatastoreConnectionToClient };
    stopped: { versionHash: string };
  }>();

  public static get datastoresDir(): string {
    return this.options.datastoresDir;
  }

  public static get queryHeroSessionsDir(): string {
    return this.options.queryHeroSessionsDir;
  }

  // SETTINGS
  public static options: IDatastoreCoreConfigureOptions = {
    serverEnvironment: env.serverEnvironment as any,
    datastoresDir: env.datastoresDir,
    queryHeroSessionsDir: env.queryHeroSessionsDir,
    datastoresTmpDir: Path.join(Os.tmpdir(), '.ulixee', 'datastore'),
    maxRuntimeMs: 10 * 60e3,
    waitForDatastoreCompletionOnShutdown: false,
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
    cloudType: 'private',
  };

  public static pluginCoresByName: { [name: string]: IExtractorPluginCore } = {};
  public static isClosing: Promise<void>;
  public static workTracker: WorkTracker;

  public static apiRegistry = new ApiRegistry<IDatastoreApiContext>([
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
  ]);

  private static datastoreRegistry: DatastoreRegistry;
  private static statsTracker: StatsTracker;
  private static storageEngineRegistry: StorageEngineRegistry;
  private static sidechainClientManager: SidechainClientManager;
  private static isStarted = new Resolvable<void>();
  private static docPages: DocpageRoutes;
  private static cloudNodeAddress: URL;
  private static hostedServicesEndpoints: HostedServicesEndpoints;
  private static datastoreApiClients: DatastoreApiClients;
  private static vm: DatastoreVm;

  private static connectionToThisCore: ConnectionToDatastoreCore;

  public static addConnection(
    transport: ITransportToClient<IDatastoreApis, IDatastoreEvents>,
  ): IDatastoreConnectionToClient {
    const context = this.getApiContext(transport.remoteId);
    const connection: IDatastoreConnectionToClient = this.apiRegistry.createConnection(
      transport,
      context,
    );
    const logger = context.logger;
    connection.on('response', ({ response, request }) => {
      logger.info(`api/${request.command} (${request.messageId})`, {
        args: request.args?.[0],
        response: response.data,
      });
    });
    context.connectionToClient = connection;
    connection.once('disconnected', () => {
      this.connections.delete(connection);
    });
    this.events.emit('connection', { connection });
    this.connections.add(connection);
    return connection;
  }

  public static addHostedServicesConnection(
    transport: ITransportToClient<TServicesApis, {}>,
  ): TConnectionToServicesClient {
    if (!this.hostedServicesEndpoints) {
      throw new Error('This CloudNode has not been configured to provide Services services.');
    }
    const context = this.getApiContext(transport.remoteId);
    return this.hostedServicesEndpoints.addConnection(transport, context);
  }

  public static registerHttpRoutes(
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

  public static registerPlugin(pluginCore: IExtractorPluginCore): void {
    this.pluginCoresByName[pluginCore.name] = pluginCore;
  }

  public static async start(options: {
    nodeAddress: URL;
    hostedServicesAddress?: URL;
    cloudType?: 'public' | 'private';
    defaultServices?: IServicesSetupApiTypes['Services.getSetup']['result'];
    peerNetwork?: IPeerNetwork;
  }): Promise<void> {
    if (this.isStarted.isResolved) return this.isStarted.promise;
    const startLogId = log.info('DatastoreCore.start', {
      options: this.options,
      sessionId: null,
    });

    const { nodeAddress, cloudType, defaultServices, hostedServicesAddress } = options;

    this.cloudNodeAddress = nodeAddress;
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

      if (defaultServices) {
        Object.assign(this.options, filterUndefined(defaultServices));
      }
      if (hostedServicesAddress) {
        // if this node is hosting services, default hosts here
        const servicesHost = hostedServicesAddress?.href;
        this.options.storageEngineHost ??= nodeAddress.href;
        this.options.statsTrackerHost ??= servicesHost;
        this.options.datastoreRegistryHost ??= servicesHost;
        // start a services services provider
        this.hostedServicesEndpoints = new HostedServicesEndpoints();
      }

      const bridge = new TransportBridge();
      this.connectionToThisCore = new ConnectionToDatastoreCore(bridge.transportToCore);
      this.datastoreApiClients = new DatastoreApiClients();

      this.vm = new DatastoreVm(this.connectionToThisCore, this.datastoreApiClients);

      const parseInClusterHost: (host: string) => URL = host => {
        const hostURL = toUrl(host);

        // safeguard against looping back to self
        if (!hostURL || hostedServicesAddress?.origin === hostURL.origin) return null;
        return hostURL;
      };

      this.storageEngineRegistry = new StorageEngineRegistry(
        this.options.datastoresDir,
        this.cloudNodeAddress,
      );

      this.statsTracker = new StatsTracker(
        this.options.datastoresDir,
        parseInClusterHost(this.options.statsTrackerHost),
      );
      this.datastoreRegistry = new DatastoreRegistry(
        this.options.datastoresDir,
        this.datastoreApiClients,
        parseInClusterHost(this.options.datastoreRegistryHost),
        options.peerNetwork,
        this.options.storageEngineHost,
        this.storageEngineRegistry.create.bind(this.storageEngineRegistry, this.vm),
      );
      this.docPages = new DocpageRoutes(this.datastoreRegistry, this.cloudNodeAddress, args =>
        DatastoreCreditsBalance.handler(args, this.getApiContext()),
      );
      await this.datastoreRegistry.diskStore.installManualUploads(
        this.options.cloudAdminIdentities,
        this.cloudNodeAddress.host,
      );

      for (const plugin of Object.values(this.pluginCoresByName)) {
        if (plugin.onCoreStart) await plugin.onCoreStart();
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

  public static async installCompressedDbx(path: string): Promise<void> {
    const filename = Path.basename(path);
    const dest = Path.join(this.options.datastoresDir, filename);
    if (!(await existsAsync(dest))) {
      if (!(await existsAsync(this.options.datastoresDir))) {
        await Fs.mkdir(this.options.datastoresDir, { recursive: true });
      }
      await Fs.copyFile(path, dest);
    }
  }

  public static async close(): Promise<void> {
    if (this.isClosing) return this.isClosing;
    const closingPromise = new Resolvable<void>();
    this.isClosing = closingPromise.promise;

    ShutdownHandler.unregister(this.close);

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
    } finally {
      closingPromise.resolve();
    }
  }

  private static onNewDatastore(event: DatastoreRegistry['EventTypes']['new']): void {
    void DatastoreMeta.handler(
      { versionHash: event.datastore.versionHash },
      this.getApiContext(),
    ).then(x => {
      return this.events.emit('new', { activity: event.activity, datastore: x });
    });
  }

  private static onDatastoreStopped(event: DatastoreRegistry['EventTypes']['stopped']): void {
    this.events.emit('stopped', event);
  }

  private static onDatastoreStats(event: StatsTracker['EventTypes']['stats']): void {
    this.events.emit('stats', { versionHash: event.versionHash, stats: translateStats(event) });
  }

  private static getApiContext(remoteId?: string): IDatastoreApiContext {
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
      vm: this.vm,
      datastoreApiClients: this.datastoreApiClients,
      statsTracker: this.statsTracker,
    };
  }

  private static showTemporaryAdminIdentityPrompt(): void {
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
