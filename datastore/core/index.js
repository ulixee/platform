"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fileUtils_1 = require("@ulixee/commons/lib/fileUtils");
const Logger_1 = require("@ulixee/commons/lib/Logger");
const objectUtils_1 = require("@ulixee/commons/lib/objectUtils");
const Resolvable_1 = require("@ulixee/commons/lib/Resolvable");
const TypedEventEmitter_1 = require("@ulixee/commons/lib/TypedEventEmitter");
const Ed25519_1 = require("@ulixee/crypto/lib/Ed25519");
const Identity_1 = require("@ulixee/crypto/lib/Identity");
const datastore_1 = require("@ulixee/datastore");
const ApiRegistry_1 = require("@ulixee/net/lib/ApiRegistry");
const TransportBridge_1 = require("@ulixee/net/lib/TransportBridge");
const fs_1 = require("fs");
const Os = require("os");
const Path = require("path");
const Datastore_admin_1 = require("./endpoints/Datastore.admin");
const Datastore_createStorageEngine_1 = require("./endpoints/Datastore.createStorageEngine");
const Datastore_creditsBalance_1 = require("./endpoints/Datastore.creditsBalance");
const Datastore_creditsIssued_1 = require("./endpoints/Datastore.creditsIssued");
const Datastore_download_1 = require("./endpoints/Datastore.download");
const Datastore_meta_1 = require("./endpoints/Datastore.meta");
const Datastore_query_1 = require("./endpoints/Datastore.query");
const Datastore_queryStorageEngine_1 = require("./endpoints/Datastore.queryStorageEngine");
const Datastore_start_1 = require("./endpoints/Datastore.start");
const Datastore_stats_1 = require("./endpoints/Datastore.stats");
const Datastore_stream_1 = require("./endpoints/Datastore.stream");
const Datastore_upload_1 = require("./endpoints/Datastore.upload");
const Datastore_versions_1 = require("./endpoints/Datastore.versions");
const Datastores_list_1 = require("./endpoints/Datastores.list");
const DocpageRoutes_1 = require("./endpoints/DocpageRoutes");
const HostedServicesEndpoints_1 = require("./endpoints/HostedServicesEndpoints");
const env_1 = require("./env");
const DatastoreApiClients_1 = require("./lib/DatastoreApiClients");
const DatastoreRegistry_1 = require("./lib/DatastoreRegistry");
const DatastoreVm_1 = require("./lib/DatastoreVm");
const errors_1 = require("./lib/errors");
const SidechainClientManager_1 = require("./lib/SidechainClientManager");
const StatsTracker_1 = require("./lib/StatsTracker");
const StorageEngineRegistry_1 = require("./lib/StorageEngineRegistry");
const translateDatastoreMetadata_1 = require("./lib/translateDatastoreMetadata");
const WorkTracker_1 = require("./lib/WorkTracker");
const { log } = (0, Logger_1.default)(module);
class DatastoreCore extends TypedEventEmitter_1.default {
    constructor(options, plugins) {
        super();
        this.pluginCoresByName = {};
        this.connections = new Set();
        this.apiRegistry = new ApiRegistry_1.default([
            Datastore_query_1.default,
            Datastore_stream_1.default,
            Datastores_list_1.default,
            Datastore_admin_1.default,
            Datastore_creditsBalance_1.default,
            Datastore_creditsIssued_1.default,
            Datastore_start_1.default,
            Datastore_versions_1.default,
            Datastore_stats_1.default,
            Datastore_meta_1.default,
            Datastore_download_1.default,
            Datastore_upload_1.default,
            Datastore_queryStorageEngine_1.default,
            Datastore_createStorageEngine_1.default,
        ]);
        this.isStarted = new Resolvable_1.default();
        this.options = {
            serverEnvironment: env_1.default.serverEnvironment,
            datastoresDir: env_1.default.datastoresDir,
            datastoresTmpDir: Path.join(Os.tmpdir(), '.ulixee', 'datastore'),
            maxRuntimeMs: 10 * 60e3,
            waitForDatastoreCompletionOnShutdown: true,
            enableDatastoreWatchMode: env_1.default.serverEnvironment === 'development',
            paymentAddress: env_1.default.paymentAddress,
            datastoresMustHaveOwnAdminIdentity: env_1.default.datastoresMustHaveOwnAdminIdentity,
            cloudAdminIdentities: env_1.default.cloudAdminIdentities,
            computePricePerQuery: env_1.default.computePricePerQuery,
            defaultBytesForPaymentEstimates: 256,
            approvedSidechains: env_1.default.approvedSidechains,
            defaultSidechainHost: env_1.default.defaultSidechainHost,
            defaultSidechainRootIdentity: env_1.default.defaultSidechainRootIdentity,
            identityWithSidechain: env_1.default.identityWithSidechain,
            approvedSidechainsRefreshInterval: 60e3 * 60,
            datastoreRegistryHost: env_1.default.datastoreRegistryHost,
            storageEngineHost: env_1.default.storageEngineHost,
            statsTrackerHost: env_1.default.statsTrackerHost,
            queryHeroSessionsDir: env_1.default.queryHeroSessionsDir,
            replayRegistryHost: env_1.default.replayRegistryHost,
            cloudType: 'private',
            ...(options ?? {}),
        };
        if (plugins)
            for (const pluginCore of plugins) {
                this.pluginCoresByName[pluginCore.name] = pluginCore;
            }
    }
    get datastoresDir() {
        return this.options.datastoresDir;
    }
    get queryHeroSessionsDir() {
        return this.options.queryHeroSessionsDir;
    }
    addConnection(transport) {
        const context = this.getApiContext(transport.remoteId);
        const connection = this.apiRegistry.createConnection(transport, context);
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
    addHostedServicesConnection(transport) {
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
    registerHttpRoutes(addHttpRoute) {
        addHttpRoute(/.*\/free-credits\/?\?crd[A-Za-z0-9_]{8}.*/, 'GET', (req, res) => this.docPages.routeCreditsBalanceApi(req, res));
        addHttpRoute(new RegExp(DocpageRoutes_1.datastorePathRegex), 'GET', (req, res, params) => this.docPages.routeHttp(req, res, params));
    }
    async start(options) {
        if (this.isStarted.isResolved)
            return this.isStarted.promise;
        const { nodeAddress, networkIdentity, cloudType, defaultServices, hostedServicesAddress, createConnectionToServiceHost, } = options;
        if (defaultServices) {
            Object.assign(this.options, (0, objectUtils_1.filterUndefined)(defaultServices));
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
            if (this.options.statsTrackerHost === 'self')
                this.options.statsTrackerHost = servicesHost;
            if (this.options.datastoreRegistryHost === 'self')
                this.options.datastoreRegistryHost = servicesHost;
            if (this.options.replayRegistryHost === 'self')
                this.options.replayRegistryHost = servicesHost;
            this.options.statsTrackerHost ??= servicesHost;
            this.options.datastoreRegistryHost ??= servicesHost;
            // start a services services provider
            this.hostedServicesEndpoints = new HostedServicesEndpoints_1.default();
        }
        const startLogId = log.info('DatastoreCore.start', {
            options: this.options,
            sessionId: null,
        });
        this.cloudNodeAddress = nodeAddress;
        this.cloudNodeIdentity = networkIdentity;
        if (cloudType)
            this.options.cloudType = cloudType;
        try {
            this.close = this.close.bind(this);
            if (this.options.serverEnvironment === 'production' &&
                !this.options.cloudAdminIdentities.length) {
                this.showTemporaryAdminIdentityPrompt();
            }
            if (!(await (0, fileUtils_1.existsAsync)(this.options.datastoresTmpDir))) {
                await fs_1.promises.mkdir(this.options.datastoresTmpDir, { recursive: true });
            }
            if (!(await (0, fileUtils_1.existsAsync)(this.options.queryHeroSessionsDir))) {
                await fs_1.promises.mkdir(this.options.queryHeroSessionsDir, { recursive: true });
            }
            if (this.options.datastoreRegistryHost && !this.options.storageEngineHost) {
                throw new errors_1.MissingRequiredSettingError('DatastoreCore has been configured with a remote Datastore Registry, but no StorageEngineHost (ULX_STORAGE_ENGINE_HOST). Remote Datastores must have an IP addressable storage engine.', 'storageEngineHost');
            }
            const bridge = new TransportBridge_1.default();
            this.connectionToThisCore = new datastore_1.ConnectionToDatastoreCore(bridge.transportToCore);
            this.datastoreApiClients = new DatastoreApiClients_1.default();
            this.vm = new DatastoreVm_1.default(this.connectionToThisCore, this.datastoreApiClients, Object.values(this.pluginCoresByName));
            this.storageEngineRegistry = new StorageEngineRegistry_1.default(this.options.datastoresDir, this.cloudNodeAddress);
            this.statsTracker = new StatsTracker_1.default(this.options.datastoresDir, createConnectionToServiceHost(this.options.statsTrackerHost));
            this.datastoreRegistry = new DatastoreRegistry_1.default(this.options.datastoresDir, this.datastoreApiClients, createConnectionToServiceHost(this.options.datastoreRegistryHost), this.options, this.onDatastoreInstalled.bind(this));
            this.docPages = new DocpageRoutes_1.default(this.datastoreRegistry, this.cloudNodeAddress, args => Datastore_creditsBalance_1.default.handler(args, this.getApiContext()));
            await this.datastoreRegistry.diskStore.installOnDiskUploads(this.options.cloudAdminIdentities);
            for (const plugin of Object.values(this.pluginCoresByName)) {
                await plugin.onCoreStart?.(this.options, {
                    createConnectionToServiceHost,
                    getSystemCore: options.getSystemCore,
                });
            }
            this.workTracker = new WorkTracker_1.default(this.options.maxRuntimeMs);
            this.sidechainClientManager = new SidechainClientManager_1.default(this.options);
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
        }
        catch (error) {
            log.stats('DatastoreCore.startError', {
                parentLogId: startLogId,
                error,
                sessionId: null,
            });
            this.isStarted.reject(error, true);
        }
        return this.isStarted;
    }
    async copyDbxToStartDir(path) {
        const filename = Path.basename(path);
        const dest = Path.join(this.options.datastoresDir, filename);
        if (!(await (0, fileUtils_1.existsAsync)(dest))) {
            if (!(await (0, fileUtils_1.existsAsync)(this.options.datastoresDir))) {
                await fs_1.promises.mkdir(this.options.datastoresDir, { recursive: true });
            }
            await fs_1.promises.copyFile(path, dest);
        }
    }
    async close() {
        if (this.isClosing)
            return this.isClosing;
        const closingPromise = new Resolvable_1.default();
        this.isClosing = closingPromise.promise;
        const logid = log.stats('DatastoreCore.Closing', {
            sessionId: null,
        });
        try {
            await this.workTracker?.stop(this.options.waitForDatastoreCompletionOnShutdown);
            for (const plugin of Object.values(this.pluginCoresByName)) {
                if (plugin.onCoreClose)
                    await plugin.onCoreClose();
            }
            this.pluginCoresByName = {};
            for (const connection of this.connections) {
                await connection.disconnect();
            }
            this.connections.clear();
            await this.datastoreRegistry?.close();
            await this.storageEngineRegistry?.close();
            await this.datastoreApiClients?.close();
            await this.statsTracker?.close();
            closingPromise.resolve();
        }
        catch (error) {
            closingPromise.reject(error);
        }
        finally {
            log.stats('DatastoreCore.Closed', { parentLogId: logid, sessionId: null });
        }
    }
    async onDatastoreInstalled(version, source, previous, options) {
        if (source === 'cluster')
            return;
        if (this.storageEngineRegistry.isHostingStorageEngine(version.storageEngineHost)) {
            await this.storageEngineRegistry.create(this.vm, version, previous, options);
        }
        else {
            const versionDbx = await this.datastoreRegistry.diskStore.getCompressedDbx(version.id, version.version);
            const previousDbx = await this.datastoreRegistry.diskStore.getCompressedDbx(previous?.id, previous?.version);
            await this.storageEngineRegistry.createRemote(version, versionDbx, previousDbx);
        }
    }
    onNewDatastore(event) {
        void Datastore_meta_1.default.handler({ id: event.datastore.id, version: event.datastore.version }, this.getApiContext()).then(x => {
            return this.emit('new', { activity: event.activity, datastore: x });
        });
    }
    async onDatastoreStopped(event) {
        this.emit('stopped', event);
        await this.storageEngineRegistry.deleteExisting(event.id, event.version);
    }
    onDatastoreStats(event) {
        this.emit('stats', {
            id: event.datastoreId,
            version: event.version,
            stats: (0, translateDatastoreMetadata_1.translateStats)(event),
        });
    }
    getApiContext(remoteId) {
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
    showTemporaryAdminIdentityPrompt() {
        const tempIdentity = Identity_1.default.createSync();
        this.options.cloudAdminIdentities.push(tempIdentity.bech32);
        const key = Ed25519_1.default.getPrivateKeyBytes(tempIdentity.privateKey);
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
exports.default = DatastoreCore;
//# sourceMappingURL=index.js.map