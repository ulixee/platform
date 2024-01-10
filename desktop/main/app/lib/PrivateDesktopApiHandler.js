"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dirUtils_1 = require("@ulixee/commons/lib/dirUtils");
const EventSubscriber_1 = require("@ulixee/commons/lib/EventSubscriber");
const eventUtils_1 = require("@ulixee/commons/lib/eventUtils");
const Resolvable_1 = require("@ulixee/commons/lib/Resolvable");
const Identity_1 = require("@ulixee/crypto/lib/Identity");
const DatastoreManifest_1 = require("@ulixee/datastore-core/lib/DatastoreManifest");
const CreditsStore_1 = require("@ulixee/datastore/lib/CreditsStore");
const DatastoreApiClient_1 = require("@ulixee/datastore/lib/DatastoreApiClient");
const net_1 = require("@ulixee/net");
const ArgonUtils_1 = require("@ulixee/sidechain/lib/ArgonUtils");
const electron_1 = require("electron");
const nanoid_1 = require("nanoid");
const Os = require("os");
const Path = require("path");
const ArgonFile_1 = require("./ArgonFile");
const argIconPath = Path.resolve(__dirname, '..', 'assets', 'arg.png');
class PrivateDesktopApiHandler extends eventUtils_1.TypedEventEmitter {
    constructor(apiManager) {
        super();
        this.apiManager = apiManager;
        this.Apis = {
            'Argon.dropFile': this.onArgonFileDrop.bind(this),
            'Credit.create': this.createCredit.bind(this),
            'Credit.save': this.saveCredit.bind(this),
            'Credit.showContextMenu': this.showContextMenu.bind(this),
            'Cloud.findAdminIdentity': this.findCloudAdminIdentity.bind(this),
            'Datastore.setAdminIdentity': this.setDatastoreAdminIdentity.bind(this),
            'Datastore.findAdminIdentity': this.findAdminIdentity.bind(this),
            'Datastore.getInstalled': this.getInstalledDatastores.bind(this),
            'Datastore.query': this.queryDatastore.bind(this),
            'Datastore.deploy': this.deployDatastore.bind(this),
            'Datastore.install': this.installDatastore.bind(this),
            'Datastore.uninstall': this.uninstallDatastore.bind(this),
            'Desktop.getAdminIdentities': this.getAdminIdentities.bind(this),
            'Desktop.getCloudConnections': this.getCloudConnections.bind(this),
            'Desktop.connectToPrivateCloud': this.connectToPrivateCloud.bind(this),
            'GettingStarted.getCompletedSteps': this.gettingStartedProgress.bind(this),
            'GettingStarted.completeStep': this.completeGettingStartedStep.bind(this),
            'Session.openReplay': this.openReplay.bind(this),
            'User.getQueries': this.getQueries.bind(this),
            'User.getBalance': this.getUserBalance.bind(this),
        };
        this.waitForConnection = new Resolvable_1.default();
        this.events = new EventSubscriber_1.default();
        this.events.on(apiManager, 'new-cloud-address', this.onNewCloudAddress.bind(this));
        this.events.on(apiManager, 'deployment', this.onDeployment.bind(this));
        this.events.on(apiManager, 'query', this.onQuery.bind(this));
    }
    onConnection(ws, req) {
        if (this.connectionToClient) {
            void this.connectionToClient.disconnect();
        }
        this.waitForConnection.resolve();
        const transport = new net_1.WsTransportToClient(ws, req);
        this.connectionToClient = new net_1.ConnectionToClient(transport, this.Apis);
        const promise = this.waitForConnection;
        this.events.once(this.connectionToClient, 'disconnected', () => {
            if (this.waitForConnection === promise)
                this.waitForConnection = new Resolvable_1.default();
        });
    }
    async close() {
        try {
            await this.connectionToClient?.disconnect();
        }
        catch { }
        this.events.close();
    }
    async getUserBalance() {
        const credits = await CreditsStore_1.default.asList();
        const centagonsBalance = 0 * Number(ArgonUtils_1.default.CentagonsPerArgon);
        const microgons = ArgonUtils_1.default.centagonsToMicrogons(centagonsBalance);
        const creditsBalance = credits.reduce((total, x) => x.remainingBalance + total, 0);
        const walletBalance = ArgonUtils_1.default.format(creditsBalance + microgons, 'microgons', 'argons');
        return {
            credits,
            centagonsBalance,
            address: this.apiManager.localUserProfile.defaultAddress.bech32,
            walletBalance,
        };
    }
    async completeGettingStartedStep(step) {
        if (!this.apiManager.localUserProfile.gettingStartedCompletedSteps.includes(step)) {
            this.apiManager.localUserProfile.gettingStartedCompletedSteps.push(step);
            await this.apiManager.localUserProfile.save();
        }
    }
    gettingStartedProgress() {
        return this.apiManager.localUserProfile.gettingStartedCompletedSteps ?? [];
    }
    async onArgonFileDrop(path) {
        const argonFile = await ArgonFile_1.default.readFromPath(path);
        await this.onArgonFileOpened(argonFile);
    }
    getInstalledDatastores() {
        return this.apiManager.localUserProfile.installedDatastores;
    }
    getQueries() {
        return Object.values(this.apiManager.queryLogWatcher.queriesById);
    }
    queryDatastore(args) {
        const { id, version, query, cloudHost } = args;
        const client = this.apiManager.getDatastoreClient(cloudHost);
        const queryId = (0, nanoid_1.nanoid)(12);
        const date = new Date();
        void client.query(id, version, query, { queryId });
        return Promise.resolve({
            date,
            query,
            input: [],
            id,
            version,
            queryId,
        });
    }
    async deployDatastore(args) {
        const { id, version, cloudName, cloudHost } = args;
        const adminIdentity = this.apiManager.localUserProfile.getAdminIdentity(id, cloudName);
        if (!cloudHost)
            throw new Error('No cloud host available.');
        const apiClient = new DatastoreApiClient_1.default(cloudHost);
        if (version.includes(DatastoreManifest_1.default.TemporaryIdPrefix)) {
            throw new Error('This Datastore has only been started. You need to deploy it.');
        }
        const download = await apiClient.download(id, version, adminIdentity);
        await apiClient.upload(download.compressedDbx, { forwardedSignature: download });
    }
    async installDatastore(arg) {
        const { cloudHost, id, version } = arg;
        await this.apiManager.localUserProfile.installDatastore(cloudHost, id, version);
    }
    async uninstallDatastore(arg) {
        const { cloudHost, id, version } = arg;
        await this.apiManager.localUserProfile.uninstallDatastore(cloudHost, id, version);
    }
    async setDatastoreAdminIdentity(datastoreId, adminIdentityPath) {
        return await this.apiManager.localUserProfile.setDatastoreAdminIdentity(datastoreId, adminIdentityPath);
    }
    async saveCredit(arg) {
        await CreditsStore_1.default.storeFromUrl(arg.credit.datastoreUrl, arg.credit.microgons);
    }
    async createCredit(args) {
        const { argons, datastore } = args;
        const address = new URL(this.apiManager.getCloudAddressByName(args.cloud));
        const adminIdentity = this.apiManager.localUserProfile.getAdminIdentity(datastore.id, args.cloud);
        if (!adminIdentity) {
            throw new Error("Sorry, we couldn't find the AdminIdentity for this cloud.");
        }
        const microgons = ArgonUtils_1.default.centagonsToMicrogons(argons * Number(ArgonUtils_1.default.CentagonsPerArgon));
        const client = new DatastoreApiClient_1.default(address.href);
        try {
            const { id, remainingCredits, secret } = await client.createCredits(datastore.id, datastore.version, microgons, adminIdentity);
            return {
                credit: {
                    datastoreUrl: `ulx://${id}:${secret}@${address.host}/${datastore.id}@v${datastore.version}`,
                    microgons: remainingCredits,
                },
                filename: `₳${argons} at ${(datastore.name ?? datastore.scriptEntrypoint)?.replace(/[.\\/]/g, '-') ??
                    'a Ulixee Datastore'}.arg`,
            };
        }
        finally {
            await client.disconnect();
        }
    }
    async dragCreditAsFile(args, context) {
        const file = Path.join(Os.tmpdir(), '.ulixee', args.filename);
        await ArgonFile_1.default.createCredit(args.credit, file);
        await context.startDrag({
            file,
            icon: argIconPath,
        });
    }
    async showContextMenu(args) {
        const file = Path.join(Os.tmpdir(), '.ulixee', args.filename);
        await ArgonFile_1.default.createCredit(args.credit, file);
        const menu = electron_1.Menu.buildFromTemplate([
            {
                label: 'Copy',
                accelerator: 'CmdOrCtrl+C',
                click() {
                    try {
                        // eslint-disable-next-line import/no-unresolved
                        const clipboardEx = require('electron-clipboard-ex');
                        clipboardEx.writeFilePaths([file]);
                    }
                    catch (e) { }
                },
            },
            {
                type: 'separator',
            },
            {
                role: 'shareMenu',
                sharingItem: {
                    filePaths: [file],
                },
            },
        ]);
        menu.popup({ x: args.position.x, y: args.position.y });
    }
    async onArgonFileOpened(file) {
        await this.waitForConnection;
        await this.connectionToClient.sendEvent({ eventType: 'Argon.opened', data: file });
    }
    async findAdminIdentity(datastoreId) {
        const result = await electron_1.dialog.showOpenDialog({
            properties: ['openFile', 'showHiddenFiles'],
            message: 'Select your Admin Identity for this Datastore to enable administrative features.',
            defaultPath: Path.join((0, dirUtils_1.getDataDirectory)(), 'ulixee', 'identities'),
            filters: [{ name: 'Identities', extensions: ['pem'] }],
        });
        if (result.filePaths.length) {
            const [filename] = result.filePaths;
            return await this.setDatastoreAdminIdentity(datastoreId, filename);
        }
        return null;
    }
    async findCloudAdminIdentity(cloudName) {
        const result = await electron_1.dialog.showOpenDialog({
            properties: ['openFile', 'showHiddenFiles'],
            message: 'Select your Admin Identity for this Cloud to enable administrative features.',
            defaultPath: Path.join((0, dirUtils_1.getDataDirectory)(), 'ulixee', 'identities'),
            filters: [{ name: 'Identities', extensions: ['pem'] }],
        });
        if (result.filePaths.length) {
            const [filename] = result.filePaths;
            return await this.apiManager.localUserProfile.setCloudAdminIdentity(cloudName, filename);
        }
        return null;
    }
    getAdminIdentities() {
        const datastoresById = {};
        for (const { datastoreId, adminIdentity } of this.apiManager.localUserProfile
            .datastoreAdminIdentities) {
            datastoresById[datastoreId] = adminIdentity;
        }
        const cloudsByName = {};
        for (const cloud of this.apiManager.apiByCloudAddress.values()) {
            if (cloud.adminIdentity) {
                cloudsByName[cloud.name] = cloud.adminIdentity;
            }
        }
        return { datastoresById, cloudsByName };
    }
    async onDeployment(event) {
        await this.connectionToClient?.sendEvent({ eventType: 'Datastore.onDeployed', data: event });
    }
    async onQuery(event) {
        await this.connectionToClient?.sendEvent({ eventType: 'User.onQuery', data: event });
    }
    async onNewCloudAddress(event) {
        await this.connectionToClient?.sendEvent({ eventType: 'Cloud.onConnected', data: event });
    }
    openReplay(arg) {
        this.emit('open-replay', arg);
    }
    getCloudConnections() {
        const result = [];
        for (const [address, group] of this.apiManager.apiByCloudAddress) {
            if (group.resolvable.isResolved && !group.resolvable.resolved?.api)
                continue;
            result.push({
                address,
                cloudNodes: group.cloudNodes,
                adminIdentity: group.adminIdentity,
                name: group.name,
                type: group.type,
            });
        }
        return result;
    }
    async connectToPrivateCloud(arg) {
        const { address, name, adminIdentityPath } = arg;
        if (!address) {
            console.warn('No valid address provided to connect to', arg);
            return;
        }
        const adminIdentity = adminIdentityPath
            ? Identity_1.default.loadFromFile(arg.adminIdentityPath).bech32
            : undefined;
        await this.apiManager.connectToCloud({
            address,
            type: 'private',
            name,
            adminIdentity,
        });
        const profile = this.apiManager.localUserProfile;
        if (!profile.clouds.find(x => x.address === address)) {
            profile.clouds.push({ address, name, adminIdentityPath: arg.adminIdentityPath });
            await profile.save();
        }
    }
}
exports.default = PrivateDesktopApiHandler;
//# sourceMappingURL=PrivateDesktopApiHandler.js.map