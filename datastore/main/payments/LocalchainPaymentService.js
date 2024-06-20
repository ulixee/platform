"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataTLD = void 0;
const dirUtils_1 = require("@ulixee/commons/lib/dirUtils");
const eventUtils_1 = require("@ulixee/commons/lib/eventUtils");
const fileUtils_1 = require("@ulixee/commons/lib/fileUtils");
const Logger_1 = require("@ulixee/commons/lib/Logger");
const Queue_1 = require("@ulixee/commons/lib/Queue");
const TypeSerializer_1 = require("@ulixee/commons/lib/TypeSerializer");
const utils_1 = require("@ulixee/commons/lib/utils");
const localchain_1 = require("@ulixee/localchain");
Object.defineProperty(exports, "DataTLD", { enumerable: true, get: function () { return localchain_1.DataTLD; } });
const ArgonUtils_1 = require("@ulixee/platform-utils/lib/ArgonUtils");
const nanoid_1 = require("nanoid");
const Path = require("node:path");
const env_1 = require("../env");
const DatastoreApiClients_1 = require("../lib/DatastoreApiClients");
const { log } = (0, Logger_1.default)(module);
if (env_1.default.defaultDataDir) {
    localchain_1.Localchain.setDefaultDir(Path.join(env_1.default.defaultDataDir, 'ulixee', 'localchain'));
}
/**
 * Singleton that will track payments for each escrow for a datastore
 */
class LocalchainPaymentService extends eventUtils_1.TypedEventEmitter {
    constructor(localchain, config, apiClients) {
        super();
        this.localchain = localchain;
        this.config = config;
        this.apiClients = apiClients;
        this.paymentsByDatastoreId = {};
        /**
         * Indicates which datastores have been loaded into the IPaymentService['whitelistRemotes'] call
         */
        this.loadedDatastoreMetadataIds = new Set();
        this.paymentsPendingFinalization = {};
        this.openEscrowsById = {};
        this.reserveQueueByDatastoreId = {};
        this.escrowQueue = new Queue_1.default('ESCROW QUEUE', 1);
        this.needsSave = false;
        this.needsApiClientsClose = false;
        if (!this.apiClients) {
            this.apiClients = new DatastoreApiClients_1.default();
            this.needsApiClientsClose = true;
        }
        this.saveInterval = setInterval(() => this.save(), 5e3).unref();
        this.sync();
    }
    async close() {
        clearInterval(this.saveInterval);
        clearTimeout(this.syncTimeout);
        await this.save();
        if (this.needsApiClientsClose) {
            await this.apiClients.close();
        }
    }
    sync() {
        clearInterval(this.syncTimeout);
        void (async () => {
            await this.localchain.balanceSync.sync();
            this.syncTimeout = setTimeout(() => this.sync(), Number(this.localchain.ticker.millisToNextTick())).unref();
        });
    }
    async getWallet() {
        const accountOverview = await this.localchain.accountOverview();
        const formattedBalance = ArgonUtils_1.default.format(accountOverview.balance, 'milligons', 'argons');
        return {
            credits: [],
            accounts: [accountOverview],
            primaryAddress: await this.localchain.address,
            formattedBalance,
        };
    }
    async connectToMainchain(mainchainUrl, timeoutMs = 10e3) {
        const mainchain = await localchain_1.MainchainClient.connect(mainchainUrl, timeoutMs);
        await this.localchain.attachMainchain(mainchain);
    }
    async load() {
        if (this.loadPromise)
            return this.loadPromise;
        this.loadPromise = (async () => {
            const paymentsByDatastore = await (0, fileUtils_1.readFileAsJson)(LocalchainPaymentService.storePath).catch(() => ({}));
            Object.assign(this.paymentsByDatastoreId, paymentsByDatastore);
        })();
    }
    async save() {
        if (!this.needsSave || !this.loadPromise)
            return;
        this.needsSave = false;
        await this.loadPromise;
        await this.writeToDisk().catch(error => {
            log.error("Error saving LocalchainPaymentService's payments", { error });
        });
    }
    async reserve(paymentInfo) {
        const microgons = paymentInfo.microgons ?? 0;
        if (!microgons || !paymentInfo.recipient)
            return null;
        let datastoreHost = paymentInfo.host;
        const datastoreId = paymentInfo.id;
        datastoreHost = (0, utils_1.toUrl)(datastoreHost).host;
        await this.load();
        this.reserveQueueByDatastoreId[datastoreId] ??= new Queue_1.default();
        this.paymentsByDatastoreId[datastoreId] ??= [];
        return await this.reserveQueueByDatastoreId[datastoreId].run(async () => {
            this.paymentsByDatastoreId[datastoreId] = this.paymentsByDatastoreId[datastoreId].filter(x => x.remaining > 0 && (!x.expirationDate || x.expirationDate > new Date()));
            for (const paymentOption of this.paymentsByDatastoreId[datastoreId]) {
                if (paymentOption.remaining >= microgons) {
                    if (paymentOption.paymentMethod.escrow?.id) {
                        if (paymentOption.host !== datastoreHost)
                            continue;
                    }
                    return await this.charge(paymentOption, microgons);
                }
            }
            const milligons = this.calculateEscrowMilligons(datastoreId, microgons);
            const details = await this.createEscrow(paymentInfo, milligons);
            return await this.charge(details, microgons);
        });
    }
    async finalize(paymentInfo) {
        const { microgons, finalMicrogons, uuid } = paymentInfo;
        const payment = this.paymentsPendingFinalization[uuid];
        if (payment) {
            delete this.paymentsPendingFinalization[uuid];
            const details = this.paymentsByDatastoreId[payment.datastoreId].find(x => x.paymentMethod.credits?.id === payment.paymentId ||
                x.paymentMethod.escrow?.id === payment.paymentId);
            details.remaining += microgons - finalMicrogons;
            this.needsSave = true;
            this.emit('finalized', {
                paymentUuid: uuid,
                initialMicrogons: microgons,
                finalMicrogons,
                remainingBalance: details.remaining,
            });
        }
    }
    async createEscrow(paymentInfo, milligons) {
        const { id, host, domain, version } = paymentInfo;
        if (this.datastoreIdsAllowedToCreateEscrows &&
            !this.datastoreIdsAllowedToCreateEscrows.has({ id, host }))
            throw new Error('Cannot create an escrow for a non-whitelisted datastore.');
        return await this.escrowQueue.run(async () => {
            const openEscrow = await this.localchain.transactions.createEscrow(milligons, paymentInfo.recipient.address, domain, paymentInfo.recipient.notaryId);
            if (milligons < localchain_1.ESCROW_MINIMUM_SETTLEMENT) {
                milligons = localchain_1.ESCROW_MINIMUM_SETTLEMENT;
            }
            const escrowJson = JSON.parse((await openEscrow.exportForSend()).toString());
            const apiClient = this.apiClients.get(host);
            await apiClient.registerEscrow(id, escrowJson);
            const escrow = await openEscrow.escrow;
            const expirationMillis = this.localchain.ticker.timeForTick(escrow.expirationTick);
            const escrowId = escrow.id;
            const allocated = Number(escrow.holdAmount) * 1000;
            const entry = {
                paymentMethod: {
                    escrow: {
                        id: escrowId,
                        settledSignature: Buffer.from(escrow.settledSignature),
                        settledMilligons: escrow.settledAmount,
                    },
                },
                id,
                version,
                remaining: allocated,
                expirationDate: new Date(Number(expirationMillis)),
                host,
                allocated,
            };
            this.emit('createdEscrow', {
                escrowId,
                datastoreId: id,
                allocatedMilligons: escrow.holdAmount,
            });
            this.openEscrowsById[escrowId] = openEscrow;
            this.paymentsByDatastoreId[id] ??= [];
            this.paymentsByDatastoreId[id].push(entry);
            return entry;
        });
    }
    async whitelistRemotes(datastoreMetadata, datastoreLookup) {
        if (this.loadedDatastoreMetadataIds.has(datastoreMetadata.id))
            return;
        this.loadedDatastoreMetadataIds.add(datastoreMetadata.id);
        this.datastoreIdsAllowedToCreateEscrows ??= new Set();
        if (!datastoreMetadata.remoteDatastores)
            return;
        for (const datastoreUrl of Object.values(datastoreMetadata.remoteDatastores)) {
            const datastoreHost = await datastoreLookup.getHostInfo(datastoreUrl);
            this.datastoreIdsAllowedToCreateEscrows.add({
                id: datastoreHost.datastoreId,
                host: datastoreHost.host,
            });
        }
    }
    calculateEscrowMilligons(_datastoreId, microgons) {
        if (this.config.escrowMilligonsStrategy.type === 'default') {
            return this.config.escrowMilligonsStrategy.milligons;
        }
        if (this.config.escrowMilligonsStrategy.type === 'multiplier') {
            return ArgonUtils_1.default.microgonsToMilligons(microgons * this.config.escrowMilligonsStrategy.queries);
        }
        throw new Error('Unknown escrow allocation strategy. Please specify in `config.escrowMilligonsStrategy.type`.');
    }
    async charge(details, microgons) {
        if (details.paymentMethod.escrow?.id) {
            await this.updateSettlement(details, microgons);
        }
        details.remaining -= microgons;
        this.needsSave = true;
        const payment = {
            uuid: (0, nanoid_1.nanoid)(),
            microgons,
            ...details.paymentMethod,
        };
        this.paymentsPendingFinalization[payment.uuid] = {
            microgons,
            datastoreId: details.id,
            paymentId: details.paymentMethod.credits?.id ?? details.paymentMethod.escrow?.id,
        };
        this.emit('reserved', {
            payment,
            datastoreId: details.id,
            remainingBalance: details.remaining,
        });
        return payment;
    }
    async updateSettlement(details, addedMicrogons) {
        const escrow = details.paymentMethod.escrow;
        if (!escrow)
            return;
        const toRelease = Math.ceil((details.allocated - details.remaining + addedMicrogons) / 1000);
        if (toRelease * 1000 > details.allocated) {
            throw new Error('Cannot release more than the allocated amount');
        }
        if (toRelease > escrow.settledMilligons) {
            this.openEscrowsById[escrow.id] ??= await this.localchain.openEscrows.get(escrow.id);
            const openEscrow = this.openEscrowsById[escrow.id];
            const result = await openEscrow.sign(BigInt(toRelease));
            escrow.settledMilligons = result.milligons;
            escrow.settledSignature = Buffer.from(result.signature);
            this.needsSave = true;
            this.emit('updateSettlement', {
                escrowId: escrow.id,
                settledMilligons: escrow.settledMilligons,
                datastoreId: details.id,
                remaining: (await openEscrow.escrow).holdAmount - escrow.settledMilligons,
            });
        }
    }
    async writeToDisk() {
        await (0, fileUtils_1.safeOverwriteFile)(LocalchainPaymentService.storePath, TypeSerializer_1.default.stringify(this.paymentsByDatastoreId, { format: true }));
    }
    static async loadOfflineLocalchain(config) {
        const { localchainPath } = config ?? {};
        let defaultPath = localchainPath ?? localchain_1.Localchain.getDefaultPath();
        if (!defaultPath.endsWith('.db')) {
            defaultPath = Path.join(defaultPath, 'primary.db');
        }
        log.info("Loading LocalchainPaymentService's localchain", {
            localchainPath: defaultPath,
        });
        let keystorePassword = config?.keystorePassword;
        if (keystorePassword &&
            !keystorePassword.password &&
            !keystorePassword.passwordFile &&
            !keystorePassword.interactiveCli) {
            keystorePassword = undefined;
        }
        return await localchain_1.Localchain.loadWithoutMainchain(defaultPath, {
            genesisUtcTime: env_1.default.genesisUtcTime,
            tickDurationMillis: env_1.default.tickDurationMillis,
            ntpPoolUrl: env_1.default.ntpPoolUrl,
        }, keystorePassword);
    }
    static async load(config) {
        const localchain = await this.loadOfflineLocalchain(config);
        const mainchainUrl = config?.mainchainUrl ?? env_1.default.mainchainUrl;
        if (mainchainUrl) {
            try {
                const mainchainClient = await localchain_1.MainchainClient.connect(mainchainUrl, 10e3);
                await localchain.attachMainchain(mainchainClient);
                await localchain.updateTicker();
            }
            catch (error) {
                log.error('Could not attach localchain to mainchain', { error });
                throw error;
            }
        }
        return new LocalchainPaymentService(localchain, {
            escrowMilligonsStrategy: config?.escrowMilligonsStrategy ?? {
                type: 'multiplier',
                queries: 100,
            },
        }, config?.apiClients);
    }
}
LocalchainPaymentService.storePath = `${(0, dirUtils_1.getDataDirectory)()}/ulixee/payments.json`;
exports.default = LocalchainPaymentService;
//# sourceMappingURL=LocalchainPaymentService.js.map