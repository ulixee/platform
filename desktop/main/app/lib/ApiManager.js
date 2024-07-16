"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cloud_1 = require("@ulixee/cloud");
const hosts_1 = require("@ulixee/commons/config/hosts");
const EventSubscriber_1 = require("@ulixee/commons/lib/EventSubscriber");
const eventUtils_1 = require("@ulixee/commons/lib/eventUtils");
const Resolvable_1 = require("@ulixee/commons/lib/Resolvable");
const utils_1 = require("@ulixee/commons/lib/utils");
const DatastoreApiClient_1 = require("@ulixee/datastore/lib/DatastoreApiClient");
const DatastoreApiClients_1 = require("@ulixee/datastore/lib/DatastoreApiClients");
const LocalUserProfile_1 = require("@ulixee/datastore/lib/LocalUserProfile");
const QueryLog_1 = require("@ulixee/datastore/lib/QueryLog");
const DefaultPaymentService_1 = require("@ulixee/datastore/payments/DefaultPaymentService");
const ArgonUtils_1 = require("@ulixee/platform-utils/lib/ArgonUtils");
const electron_1 = require("electron");
const http = require("http");
const Path = require("path");
const WebSocket = require("ws");
const AccountManager_1 = require("./AccountManager");
const ApiClient_1 = require("./ApiClient");
const ArgonFile_1 = require("./ArgonFile");
const DeploymentWatcher_1 = require("./DeploymentWatcher");
const PrivateDesktopApiHandler_1 = require("./PrivateDesktopApiHandler");
const { version } = require('../package.json');
const bundledDatastoreExample = Path.join(__dirname, '../assets/ulixee-docs.dbx.tgz');
class ApiManager extends eventUtils_1.TypedEventEmitter {
    constructor() {
        super();
        this.apiByCloudAddress = new Map();
        this.exited = false;
        this.events = new EventSubscriber_1.default();
        this.datastoreApiClients = new DatastoreApiClients_1.default();
        this.reconnectsByAddress = {};
        this.localUserProfile = new LocalUserProfile_1.default();
        this.deploymentWatcher = new DeploymentWatcher_1.default();
        this.queryLogWatcher = new QueryLog_1.default();
        this.privateDesktopApiHandler = new PrivateDesktopApiHandler_1.default(this);
        this.accountManager = new AccountManager_1.default(this.localUserProfile);
    }
    async start() {
        this.debuggerUrl = await this.getDebuggerUrl();
        this.privateDesktopWsServer = new WebSocket.Server({ port: 0 });
        this.events.on(this.privateDesktopWsServer, 'connection', this.handlePrivateApiWsConnection.bind(this));
        this.privateDesktopWsServerAddress = await new Promise(resolve => {
            this.privateDesktopWsServer.once('listening', () => {
                const address = this.privateDesktopWsServer.address();
                resolve(`ws://127.0.0.1:${address.port}`);
            });
        });
        this.paymentService = new DefaultPaymentService_1.default();
        await this.accountManager.start();
        this.events.on(this.accountManager, 'update', ev => this.emit('wallet-updated', { wallet: ev.wallet }));
        if (!this.localUserProfile.defaultAdminIdentityPath) {
            await this.localUserProfile.createDefaultAdminIdentity();
        }
        this.deploymentWatcher.start();
        this.queryLogWatcher.monitor(x => this.emit('query', x));
        await this.startLocalCloud();
        this.events.on(hosts_1.default.global, 'change', this.onNewLocalCloudAddress.bind(this));
        this.events.on(this.deploymentWatcher, 'new', x => this.emit('deployment', x));
        for (const cloud of this.localUserProfile.clouds) {
            await this.connectToCloud({
                ...cloud,
                adminIdentity: cloud.adminIdentity,
                type: 'private',
            });
        }
    }
    async getWallet() {
        const localchainWallet = await this.accountManager.getWallet();
        const credits = await this.paymentService.credits();
        const creditBalance = credits.reduce((sum, x) => sum + x.remaining, 0);
        const creditMilligons = ArgonUtils_1.default.microgonsToMilligons(creditBalance);
        const localchainBalance = localchainWallet.accounts.reduce((sum, x) => sum + x.balance + x.mainchainBalance, 0n);
        const brokerBalance = localchainWallet.brokerAccounts.reduce((sum, x) => sum + x.balance, 0n);
        const formattedBalance = ArgonUtils_1.default.format(localchainBalance + creditMilligons + brokerBalance, 'milligons', 'argons');
        return {
            credits,
            accounts: localchainWallet.accounts,
            brokerAccounts: localchainWallet.brokerAccounts,
            formattedBalance,
        };
    }
    async close() {
        if (this.exited)
            return;
        this.exited = true;
        await this.localCloud?.desktopCore?.shutdown();
        await this.stopLocalCloud();
        this.privateDesktopWsServer?.close();
        await this.privateDesktopApiHandler.close();
        this.events.close('error');
        for (const connection of this.apiByCloudAddress.values()) {
            await this.closeApiGroup(connection.resolvable);
        }
        await this.datastoreApiClients.close();
        this.apiByCloudAddress.clear();
        this.deploymentWatcher.stop();
        await this.queryLogWatcher.close();
    }
    async stopLocalCloud() {
        await this.localCloud?.close();
    }
    async startLocalCloud() {
        let localCloudAddress = hosts_1.default.global.getVersionHost(version);
        localCloudAddress = await hosts_1.default.global.checkLocalVersionHost(version, localCloudAddress);
        let adminIdentity;
        if (!localCloudAddress) {
            adminIdentity = this.localUserProfile.defaultAdminIdentity.bech32;
            this.localCloud ??= new cloud_1.CloudNode({
                shouldShutdownOnSignals: false,
                host: 'localhost',
                datastoreConfiguration: {
                    cloudAdminIdentities: [adminIdentity],
                },
            });
            await this.localCloud.datastoreCore.copyDbxToStartDir(bundledDatastoreExample);
            await this.localCloud.listen();
            localCloudAddress = await this.localCloud.address;
        }
        await this.connectToCloud({ address: localCloudAddress, type: 'local', adminIdentity });
    }
    getDatastoreClient(cloudHost) {
        const hostUrl = (0, utils_1.toUrl)(cloudHost);
        this.datastoreApiClients[cloudHost] ??= new DatastoreApiClient_1.default(hostUrl.origin);
        return this.datastoreApiClients[cloudHost];
    }
    getCloudAddressByName(name) {
        for (const [address, entry] of this.apiByCloudAddress) {
            if (entry.name === name)
                return address;
        }
    }
    async connectToCloud(cloud) {
        const { adminIdentity, oldAddress, type } = cloud;
        let { address, name } = cloud;
        if (!address)
            return;
        name ??= type;
        address = this.formatCloudAddress(address);
        if (this.apiByCloudAddress.has(address)) {
            await this.apiByCloudAddress.get(address).resolvable.promise;
            return;
        }
        try {
            this.apiByCloudAddress.set(address, {
                name: name ?? type,
                adminIdentity,
                type,
                cloudNodes: 0,
                resolvable: new Resolvable_1.default(),
            });
            const api = new ApiClient_1.default(`${address}?type=app`, this.onDesktopEvent.bind(this, address));
            await api.connect();
            const onApiClosed = this.events.once(api, 'close', this.onApiClosed.bind(this, cloud));
            const mainScreen = electron_1.screen.getPrimaryDisplay();
            const workarea = mainScreen.workArea;
            const { id, cloudNodes } = await api.send('App.connect', {
                workarea: {
                    left: workarea.x,
                    top: workarea.y,
                    ...workarea,
                    scale: mainScreen.scaleFactor,
                },
            });
            const cloudApi = this.apiByCloudAddress.get(address);
            cloudApi.cloudNodes = cloudNodes ?? 0;
            let url;
            try {
                url = new URL(`/desktop-devtools`, api.transport.host);
                url.searchParams.set('id', id);
            }
            catch (error) {
                console.error('Invalid ChromeAlive Devtools URL', error, { address });
            }
            // pipe connection
            const [wsToCore, wsToDevtoolsProtocol] = await Promise.all([
                this.connectToWebSocket(url.href, { perMessageDeflate: true }),
                this.connectToWebSocket(this.debuggerUrl),
            ]);
            clearInterval(this.reconnectsByAddress[address]);
            const events = [
                this.events.on(wsToCore, 'message', msg => wsToDevtoolsProtocol.send(msg)),
                this.events.on(wsToCore, 'error', this.onDevtoolsError.bind(this, wsToCore)),
                this.events.once(wsToCore, 'close', this.onApiClosed.bind(this, cloud)),
                this.events.on(wsToDevtoolsProtocol, 'message', msg => wsToCore.send(msg)),
                this.events.on(wsToDevtoolsProtocol, 'error', this.onDevtoolsError.bind(this, wsToDevtoolsProtocol)),
                this.events.once(wsToDevtoolsProtocol, 'close', this.onApiClosed.bind(this, cloud)),
            ];
            this.events.group(`ws-${address}`, onApiClosed, ...events);
            cloudApi.resolvable.resolve({
                id,
                api,
                wsToCore,
                wsToDevtoolsProtocol,
            });
            this.emit('new-cloud-address', {
                address,
                adminIdentity,
                name,
                cloudNodes,
                type,
                oldAddress,
            });
        }
        catch (error) {
            this.apiByCloudAddress.get(address)?.resolvable.reject(error, true);
            throw error;
        }
    }
    async onArgonFileOpened(file) {
        const argonFile = await ArgonFile_1.default.readFromPath(file);
        if (argonFile) {
            this.emit('argon-file-opened', argonFile);
        }
    }
    onDesktopEvent(cloudAddress, eventType, data) {
        if (this.exited)
            return;
        if (eventType === 'Session.opened') {
            this.emit('api-event', { cloudAddress, eventType, data });
        }
        if (eventType === 'App.quit') {
            const apis = this.apiByCloudAddress.get(cloudAddress);
            if (apis) {
                void this.closeApiGroup(apis.resolvable);
            }
        }
    }
    onDevtoolsError(ws, error) {
        console.warn('ERROR in devtools websocket with Core at %s', ws.url, error);
    }
    async onNewLocalCloudAddress() {
        const newAddress = hosts_1.default.global.getVersionHost(version);
        if (!newAddress)
            return;
        if (this.localCloudAddress !== newAddress) {
            const oldAddress = this.localCloudAddress;
            this.localCloudAddress = this.formatCloudAddress(newAddress);
            // eslint-disable-next-line no-console
            console.log('Desktop app connecting to local cloud', this.localCloudAddress);
            await this.connectToCloud({
                address: this.localCloudAddress,
                adminIdentity: this.localUserProfile.defaultAdminIdentity?.bech32,
                name: 'local',
                type: 'local',
                oldAddress,
            });
        }
    }
    onApiClosed(cloud) {
        const { address, name } = cloud;
        console.warn('Api Disconnected', address, name);
        const api = this.apiByCloudAddress.get(address);
        this.events.endGroup(`ws-${address}`);
        if (api) {
            void this.closeApiGroup(api.resolvable);
        }
        this.apiByCloudAddress.delete(address);
        if (!this.exited) {
            this.reconnectsByAddress[cloud.address] = setTimeout(this.reconnect.bind(this, cloud, 1e3), 1e3).unref();
        }
    }
    reconnect(cloud, delay) {
        if (this.exited)
            return;
        console.warn('Reconnecting to Api', { address: cloud.address, name: cloud.name });
        void this.connectToCloud(cloud).catch(() => {
            this.reconnectsByAddress[cloud.address] = setTimeout(this.reconnect.bind(this, cloud, delay * 2), Math.min(5 * 60e3, delay * 2)).unref();
        });
    }
    async closeApiGroup(group) {
        const { api, wsToCore, wsToDevtoolsProtocol } = await group;
        if (api.isConnected)
            await api.disconnect();
        wsToCore?.close();
        return wsToDevtoolsProtocol?.close();
    }
    async connectToWebSocket(host, options) {
        const ws = new WebSocket(host, options);
        await new Promise((resolve, reject) => {
            const closeEvents = [
                this.events.once(ws, 'close', reject),
                this.events.once(ws, 'error', reject),
            ];
            this.events.once(ws, 'open', () => {
                this.events.off(...closeEvents);
                resolve();
            });
        });
        return ws;
    }
    handlePrivateApiWsConnection(ws, req) {
        this.privateDesktopApiHandler.onConnection(ws, req);
    }
    async getDebuggerUrl() {
        const responseBody = await new Promise((resolve, reject) => {
            const request = http.get(`http://127.0.0.1:${process.env.DEVTOOLS_PORT}/json/version`, async (res) => {
                let jsonString = '';
                res.setEncoding('utf8');
                for await (const chunk of res)
                    jsonString += chunk;
                resolve(jsonString);
            });
            request.once('error', reject);
            request.end();
        });
        const debugEndpoints = JSON.parse(responseBody);
        return debugEndpoints.webSocketDebuggerUrl;
    }
    formatCloudAddress(host) {
        const url = (0, utils_1.toUrl)(host);
        url.pathname = '/desktop';
        return url.href;
    }
}
exports.default = ApiManager;
//# sourceMappingURL=ApiManager.js.map