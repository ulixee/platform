import * as Os from 'os';
import * as Path from 'path';
import { createReadStream, promises as Fs } from 'fs';
import { IncomingMessage, ServerResponse } from 'http';
import * as Finalhandler from 'finalhandler';
import * as ServeStatic from 'serve-static';
import IRunnerPluginCore from '@ulixee/datastore/interfaces/IRunnerPluginCore';
import ITransportToClient from '@ulixee/net/interfaces/ITransportToClient';
import Logger from '@ulixee/commons/lib/Logger';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import ApiRegistry from '@ulixee/net/lib/ApiRegistry';
import { IDatastoreApis, IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import IDatastoreEvents from '@ulixee/datastore/interfaces/IDatastoreEvents';
import Identity from '@ulixee/crypto/lib/Identity';
import Ed25519 from '@ulixee/crypto/lib/Ed25519';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import IDatastoreDomainResponse from '@ulixee/datastore/interfaces/IDatastoreDomainResponse';
import TypedEventEmitter from '@ulixee/commons/lib/TypedEventEmitter';
import DocspageDir from '@ulixee/datastore-docpage';
import IDatastoreCoreConfigureOptions from './interfaces/IDatastoreCoreConfigureOptions';
import env from './env';
import DatastoreRegistry from './lib/DatastoreRegistry';
import WorkTracker from './lib/WorkTracker';
import IDatastoreApiContext from './interfaces/IDatastoreApiContext';
import SidechainClientManager from './lib/SidechainClientManager';
import DatastoreUpload from './endpoints/Datastore.upload';
import DatastoreQuery from './endpoints/Datastore.query';
import DatastoreMeta from './endpoints/Datastore.meta';
import IDatastoreConnectionToClient from './interfaces/IDatastoreConnectionToClient';
import DatastoreStream from './endpoints/Datastore.stream';
import DatastoreAdmin from './endpoints/Datastore.admin';
import DatastoreCreditsBalance from './endpoints/Datastore.creditsBalance';
import DatastoreVm from './lib/DatastoreVm';
import { DatastoreNotFoundError } from './lib/errors';
import DatastoresList from './endpoints/Datastores.list';
import DatastoreStart from './endpoints/Datastore.start';
import DatastoreDownload from './endpoints/Datastore.download';
import DatastoreCreditsIssued from './endpoints/Datastore.creditsIssued';
import { translateStats } from './lib/translateDatastoreMetadata';

const { log } = Logger(module);

const docPageServer = ServeStatic(DocspageDir);

export default class DatastoreCore {
  public static connections = new Set<IDatastoreConnectionToClient>();
  public static events = new TypedEventEmitter<{
    new: {
      datastore: IDatastoreApiTypes['Datastore.meta']['result'];
      activity: 'started' | 'uploaded';
    };
    stats: Pick<IDatastoreApiTypes['Datastore.meta']['result'], 'stats' | 'versionHash'>;
    stopped: { versionHash: string };
  }>();

  public static get datastoresDir(): string {
    return this.options.datastoresDir;
  }

  // SETTINGS
  public static options: IDatastoreCoreConfigureOptions = {
    serverEnvironment: env.serverEnvironment as any,
    datastoresDir: env.datastoresDir,
    datastoresTmpDir: Path.join(Os.tmpdir(), '.ulixee', 'datastore'),
    maxRuntimeMs: 10 * 60e3,
    waitForDatastoreCompletionOnShutdown: false,
    enableDatastoreWatchMode: env.serverEnvironment === 'development',
    paymentAddress: env.paymentAddress,
    requireDatastoreAdminIdentities: env.requireDatastoreAdminIdentities,
    cloudAdminIdentities: env.cloudAdminIdentities,
    computePricePerQuery: env.computePricePerQuery,
    defaultBytesForPaymentEstimates: 256,
    approvedSidechains: env.approvedSidechains,
    defaultSidechainHost: env.defaultSidechainHost,
    defaultSidechainRootIdentity: env.defaultSidechainRootIdentity,
    identityWithSidechain: env.identityWithSidechain,
    approvedSidechainsRefreshInterval: 60e3 * 60, // 1 hour
  };

  public static pluginCoresByName: { [name: string]: IRunnerPluginCore } = {};
  public static isClosing: Promise<void>;
  public static workTracker: WorkTracker;
  public static apiRegistry = new ApiRegistry<IDatastoreApiContext>([
    DatastoreUpload,
    DatastoreDownload,
    DatastoreQuery,
    DatastoreStream,
    DatastoresList,
    DatastoreAdmin,
    DatastoreCreditsBalance,
    DatastoreCreditsIssued,
    DatastoreStart,
    DatastoreMeta,
  ]);

  private static datastoreRegistry: DatastoreRegistry;
  private static sidechainClientManager: SidechainClientManager;
  private static isStarted = new Resolvable<void>();

  private static serverAddress: { ipAddress: string; port: number };

  public static addConnection(
    transport: ITransportToClient<IDatastoreApis, IDatastoreEvents>,
  ): IDatastoreConnectionToClient {
    const context = this.getApiContext(transport.remoteId);
    const connection: IDatastoreConnectionToClient = this.apiRegistry.createConnection(
      transport,
      context,
    );
    context.connectionToClient = connection;
    connection.once('disconnected', () => {
      this.connections.delete(connection);
    });
    this.connections.add(connection);
    return connection;
  }

  public static async routeOptions(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const host = req.headers.host.replace(`:${this.serverAddress.port}`, '').split('://').pop();

    const domainVersion = await this.datastoreRegistry.getByDomain(host);
    if (!domainVersion) {
      res.writeHead(404);
      res.end(
        TypeSerializer.stringify(
          new DatastoreNotFoundError(
            `A datastore mapped to the domain ${host} could not be located.`,
          ),
        ),
      );
    } else {
      res.end(
        TypeSerializer.stringify(<IDatastoreDomainResponse>{
          datastoreVersionHash: domainVersion.versionHash,
          host: `${this.serverAddress.ipAddress}:${this.serverAddress.port}`,
        }),
      );
    }
  }

  public static async routeCreditsBalanceApi(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<boolean> {
    if (req.headers.accept !== 'application/json') return false;
    let datastoreVersionHash = '';

    let host = req.headers.host ?? `${this.serverAddress.ipAddress}:${this.serverAddress.port}`;
    if (!host.includes('://')) host = `http://${host}`;
    const url = new URL(req.url, host);

    if (!url.host.includes('localhost')) {
      const domainVersion = this.datastoreRegistry.getByDomain(url.hostname);
      datastoreVersionHash = domainVersion?.versionHash;
    }
    if (!datastoreVersionHash) {
      const match = url.pathname.match(/(dbx1[ac-hj-np-z02-9]{18})(\/(.+)?)?/);
      datastoreVersionHash = match[1];
    }
    if (!datastoreVersionHash) {
      res.writeHead(409, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'No valid Datastore VersionHash could be found.' }));
    }

    const creditId = url.searchParams.keys().next().value.split(':').shift();
    const result = await DatastoreCreditsBalance.handler(
      { datastoreVersionHash, creditId },
      this.getApiContext(),
    );

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(result));
    return true;
  }

  public static async routeHttpRoot(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const host = req.headers.host.replace(`:${this.serverAddress.port}`, '').split('://').pop();

    const domainVersion = this.datastoreRegistry.getByDomain(host);
    if (!domainVersion) return false;

    const params = [domainVersion.versionHash];
    if (req.url.length) params.push(req.url);
    await this.routeHttp(req, res, params);
  }

  public static async routeHttp(
    req: IncomingMessage,
    res: ServerResponse,
    params: string[],
  ): Promise<void> {
    if (!params[1]) {
      const url = new URL(req.url, 'http://localhost/');
      url.pathname += '/';
      const search = url.search !== '?' ? url.search : '';
      res.writeHead(301, { location: `${url.pathname}${search}` });
      res.end();
      return;
    }

    if (req.url.includes('docpage.json')) {
      const versionHash = params[0];
      const { path } = await this.datastoreRegistry.getByVersionHash(versionHash);
      const docpagePath = path.replace('datastore.js', 'docpage.json');
      res.writeHead(200, { 'content-type': 'application/json' });
      createReadStream(docpagePath, { autoClose: true }).pipe(res, { end: true });
      return;
    }

    if (
      params[1].startsWith('/js/') ||
      params[1].startsWith('/css/') ||
      params[1].startsWith('/img/') ||
      params[1] === '/favicon.ico'
    ) {
      req.url = params[1];
    } else {
      req.url = '/';
    }
    const done = Finalhandler(req, res);
    docPageServer(req, res, done);
  }

  public static registerPlugin(pluginCore: IRunnerPluginCore): void {
    this.pluginCoresByName[pluginCore.name] = pluginCore;
  }

  public static async start(config: { ipAddress: string; port: number }): Promise<void> {
    if (this.isStarted.isResolved) return this.isStarted.promise;
    const startLogId = log.info('DatastoreCore.start', {
      options: this.options,
      sessionId: null,
    });
    this.serverAddress = config;
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
      this.datastoreRegistry = new DatastoreRegistry(this.options.datastoresDir);
      await this.datastoreRegistry.installManuallyUploadedDbxFiles();

      await new Promise(resolve => process.nextTick(resolve));

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
      this.datastoreRegistry.on('new', this.onNewDatastore.bind(this));
      this.datastoreRegistry.on('stats', this.onDatastoreStats.bind(this));
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
      this.datastoreRegistry?.close();
      await DatastoreVm.close();
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

  private static onDatastoreStats(event: DatastoreRegistry['EventTypes']['stats']): void {
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
