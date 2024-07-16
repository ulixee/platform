"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EventSubscriber_1 = require("@ulixee/commons/lib/EventSubscriber");
const eventUtils_1 = require("@ulixee/commons/lib/eventUtils");
const Logger_1 = require("@ulixee/commons/lib/Logger");
const Queue_1 = require("@ulixee/commons/lib/Queue");
const env_1 = require("@ulixee/datastore/env");
const DatastoreLookup_1 = require("@ulixee/datastore/lib/DatastoreLookup");
const localchain_1 = require("@ulixee/localchain");
const IArgonFile_1 = require("@ulixee/platform-specification/types/IArgonFile");
const ArgonUtils_1 = require("@ulixee/platform-utils/lib/ArgonUtils");
const objectUtils_1 = require("@ulixee/platform-utils/lib/objectUtils");
const serdeJson_1 = require("@ulixee/platform-utils/lib/serdeJson");
const Path = require("path");
const BrokerEscrowSource_1 = require("@ulixee/datastore/payments/BrokerEscrowSource");
const { log } = (0, Logger_1.default)(module);
class AccountManager extends eventUtils_1.TypedEventEmitter {
    constructor(localUserProfile) {
        super();
        this.localUserProfile = localUserProfile;
        this.exited = false;
        this.events = new EventSubscriber_1.default();
        this.localchains = [];
        this.localchainAddresses = new Map();
        this.queue = new Queue_1.default('LOCALCHAIN', 1);
        if (env_1.default.defaultDataDir) {
            localchain_1.Localchain.setDefaultDir(Path.join(env_1.default.defaultDataDir, 'ulixee', 'localchain'));
        }
    }
    async loadMainchainClient(url, timeoutMillis) {
        url ??= env_1.default.mainchainUrl;
        if (url) {
            try {
                this.mainchainClient = await localchain_1.MainchainClient.connect(url, timeoutMillis ?? 10e3);
                for (const localchain of this.localchains) {
                    await localchain.attachMainchain(this.mainchainClient);
                    await localchain.updateTicker();
                }
            }
            catch (error) {
                log.error('Could not connect to mainchain', { error });
                throw error;
            }
        }
    }
    async start() {
        if (!this.localUserProfile.localchainPaths.length) {
            await this.addAccount();
        }
        this.localchains = await Promise.all(this.localUserProfile.localchainPaths.map(path => localchain_1.Localchain.loadWithoutMainchain(path, {
            genesisUtcTime: env_1.default.genesisUtcTime,
            tickDurationMillis: env_1.default.tickDurationMillis,
            ntpPoolUrl: env_1.default.ntpPoolUrl,
        })));
        void this.loadMainchainClient().then(this.emitWallet.bind(this));
        this.scheduleNextSync();
    }
    async close() {
        if (this.exited)
            return;
        this.exited = true;
    }
    async addBrokerAccount(config) {
        // check first and throw error if invalid
        const balance = await this.getBrokerBalance(config.host, config.userIdentity);
        const entry = this.localUserProfile.databrokers.find(x => x.host === config.host);
        if (entry) {
            entry.userIdentity = config.userIdentity;
            entry.name = config.name;
        }
        else {
            this.localUserProfile.databrokers.push(config);
        }
        await this.localUserProfile.save();
        return {
            ...config,
            balance,
        };
    }
    async getBrokerBalance(host, identity) {
        return await BrokerEscrowSource_1.default.getBalance(host, identity);
    }
    async getBrokerAccounts() {
        const brokers = this.localUserProfile.databrokers.map(x => ({ ...x, balance: 0n }));
        for (const broker of brokers) {
            broker.balance = await this.getBrokerBalance(broker.host, broker.userIdentity).catch(() => 0n);
        }
        return brokers;
    }
    async addAccount(config = {}) {
        config ??= {};
        let defaultPath = config.path ?? localchain_1.Localchain.getDefaultPath();
        if (!defaultPath.endsWith('.db')) {
            defaultPath = Path.join(defaultPath, 'primary.db');
        }
        log.info('Adding localchain', {
            localchainPath: defaultPath,
        });
        const password = config.password
            ? {
                password: Buffer.from(config.password),
            }
            : undefined;
        const localchain = await localchain_1.Localchain.loadWithoutMainchain(defaultPath, {
            ...env_1.default,
        }, password);
        this.localchains.push(localchain);
        if (!this.localUserProfile.localchainPaths.includes(localchain.path)) {
            this.localUserProfile.localchainPaths.push(localchain.path);
            await this.localUserProfile.save();
        }
        if (this.mainchainClient) {
            await localchain.attachMainchain(this.mainchainClient);
            await localchain.updateTicker();
        }
        if (!(await localchain.accounts.list()).length) {
            if (config.suri) {
                await localchain.keystore.importSuri(config.suri, config.cryptoScheme ?? localchain_1.CryptoScheme.Sr25519, {
                    password: config.password ? Buffer.from(config.password) : undefined,
                });
            }
            else {
                await localchain.keystore.bootstrap();
            }
        }
        return localchain;
    }
    async getAddress(localchain) {
        if (!this.localchainAddresses.has(localchain)) {
            this.localchainAddresses.set(localchain, await localchain.address);
        }
        return this.localchainAddresses.get(localchain);
    }
    async getLocalchain(address) {
        if (!address)
            return null;
        for (const chain of this.localchains) {
            if ((await this.getAddress(chain)) === address)
                return chain;
        }
    }
    async getDatastoreHostLookup() {
        return new DatastoreLookup_1.default(this.mainchainClient);
    }
    async getWallet() {
        const accounts = await Promise.all(this.localchains.map(x => x.accountOverview()));
        const brokerAccounts = await this.getBrokerAccounts();
        let balance = 0n;
        for (const account of accounts) {
            balance += account.balance + account.mainchainBalance;
        }
        for (const account of brokerAccounts) {
            balance += account.balance;
        }
        const formattedBalance = ArgonUtils_1.default.format(balance, 'milligons', 'argons');
        return {
            credits: [],
            brokerAccounts,
            accounts,
            formattedBalance,
        };
    }
    async transferMainchainToLocal(address, amount) {
        const localchain = await this.getLocalchain(address);
        if (!localchain)
            throw new Error('No localchain found for address');
        await localchain.mainchainTransfers.sendToLocalchain(amount);
    }
    async transferLocalToMainchain(address, amount) {
        const localchain = await this.getLocalchain(address);
        if (!localchain)
            throw new Error('No localchain found for address');
        const change = localchain.beginChange();
        const account = await change.defaultDepositAccount();
        await account.sendToMainchain(amount);
        const result = await change.notarize();
        log.info('Localchain to mainchain transfer notarized', {
            notarizationTracker: await (0, objectUtils_1.gettersToObject)(result),
        });
    }
    async createAccount(name, suri, password) {
        const path = Path.join(localchain_1.Localchain.getDefaultDir(), `${name}.db`);
        const localchain = await this.addAccount({ path, suri, password });
        return await localchain.accountOverview();
    }
    async createArgonsToSendFile(request) {
        const localchain = (await this.getLocalchain(request.fromAddress)) ?? this.localchains[0];
        const file = await localchain.transactions.send(request.milligons, request.toAddress ? [request.toAddress] : null);
        const argonFile = JSON.parse(file);
        const recipient = request.toAddress ? `for ${request.toAddress}` : 'cash';
        return {
            rawJson: file,
            file: IArgonFile_1.ArgonFileSchema.parse(argonFile),
            name: `${ArgonUtils_1.default.format(request.milligons, 'milligons', 'argons')} ${recipient}.arg`,
        };
    }
    async createArgonsToRequestFile(request) {
        const localchain = (await this.getLocalchain(request.sendToMyAddress)) ?? this.localchains[0];
        const file = await localchain.transactions.request(request.milligons);
        const argonFile = JSON.parse(file);
        return {
            rawJson: file,
            file: IArgonFile_1.ArgonFileSchema.parse(argonFile),
            name: `Argon Request ${new Date().toLocaleString()}`,
        };
    }
    async acceptArgonRequest(argonFile, fulfillFromAccount) {
        if (!argonFile.request) {
            throw new Error('This Argon file is not a request');
        }
        let fromAddress = fulfillFromAccount;
        if (!fromAddress) {
            const funding = argonFile.request.reduce((sum, x) => {
                if (x.accountType === 'deposit') {
                    for (const note of x.notes) {
                        if (note.noteType.action === 'claim')
                            sum += note.milligons;
                    }
                }
                return sum;
            }, 0n);
            for (const account of this.localchains) {
                const overview = await account.accountOverview();
                if (overview.balance >= funding) {
                    fromAddress = overview.address;
                    break;
                }
            }
        }
        const localchain = (await this.getLocalchain(fromAddress)) ?? this.localchains[0];
        const argonFileJson = (0, serdeJson_1.default)(argonFile);
        await this.queue.run(async () => {
            const importChange = localchain.beginChange();
            await importChange.acceptArgonFileRequest(argonFileJson);
            const result = await importChange.notarize();
            log.info('Argon request notarized', {
                notarizationTracker: await (0, objectUtils_1.gettersToObject)(result),
            });
        });
    }
    async importArgons(argonFile) {
        if (!argonFile.send) {
            throw new Error('This Argon file does not contain any sent argons');
        }
        const filters = argonFile.send
            .map(x => {
            if (x.accountType === 'deposit') {
                for (const note of x.notes) {
                    if (note.noteType.action === 'send') {
                        return note.noteType.to;
                    }
                }
            }
            return [];
        })
            .flat()
            .filter(Boolean);
        let localchain = this.localchains[0];
        for (const filter of filters) {
            const lookup = await this.getLocalchain(filter);
            if (lookup) {
                localchain = lookup;
                break;
            }
        }
        const argonFileJson = (0, serdeJson_1.default)(argonFile);
        await this.queue.run(async () => {
            const importChange = localchain.beginChange();
            await importChange.importArgonFile(argonFileJson);
            const result = await importChange.notarize();
            log.info('Argon import notarized', {
                notarizationTracker: await (0, objectUtils_1.gettersToObject)(result),
            });
        });
    }
    scheduleNextSync() {
        const localchain = this.localchains[0];
        if (!localchain)
            return null;
        const nextTick = Number(localchain.ticker.millisToNextTick());
        this.nextTick = setTimeout(() => this.sync().catch(() => null), nextTick + 1);
    }
    async sync() {
        clearTimeout(this.nextTick);
        try {
            const syncs = [];
            for (const localchain of this.localchains) {
                syncs.push(await this.queue.run(async () => localchain.balanceSync.sync()));
            }
            const result = syncs.reduce((x, next) => {
                x.escrowNotarizations.push(...next.escrowNotarizations);
                x.balanceChanges.push(...next.balanceChanges);
                x.jumpAccountConsolidations.push(...next.jumpAccountConsolidations);
                x.mainchainTransfers.push(...next.mainchainTransfers);
                return x;
            }, {
                escrowNotarizations: [],
                balanceChanges: [],
                jumpAccountConsolidations: [],
                mainchainTransfers: [],
            });
            if (result.mainchainTransfers.length || result.balanceChanges.length) {
                log.info('Account sync result', {
                    ...(await (0, objectUtils_1.gettersToObject)(result)),
                });
                await this.emitWallet();
            }
        }
        catch (error) {
            log.error('Error synching account balance changes', { error });
        }
        this.scheduleNextSync();
    }
    async emitWallet() {
        const wallet = await this.getWallet();
        this.emit('update', { wallet });
    }
}
exports.default = AccountManager;
//# sourceMappingURL=AccountManager.js.map