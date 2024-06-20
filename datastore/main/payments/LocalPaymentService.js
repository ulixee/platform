"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const eventUtils_1 = require("@ulixee/commons/lib/eventUtils");
const ArgonUtils_1 = require("@ulixee/platform-utils/lib/ArgonUtils");
const DatastoreLookup_1 = require("../lib/DatastoreLookup");
const CreditPaymentService_1 = require("./CreditPaymentService");
/**
 * A LocalPaymentService combines credits with a localchain payment service.
 */
class LocalPaymentService extends eventUtils_1.TypedEventEmitter {
    constructor(localchainPaymentService, loadCreditFromPath = 'default') {
        super();
        this.creditsByDatastoreId = {};
        this.paymentUuidToService = {};
        this.creditsPath = CreditPaymentService_1.default.defaultBasePath;
        this.localchainPaymentService = localchainPaymentService;
        if (loadCreditFromPath) {
            this.creditsPath =
                loadCreditFromPath === 'default'
                    ? CreditPaymentService_1.default.defaultBasePath
                    : loadCreditFromPath;
            this.creditsAutoLoaded = this.loadCredits().catch(() => null);
        }
        this.localchainPaymentService?.addEventEmitter(this, [
            'reserved',
            'finalized',
            'createdEscrow',
            'updateSettlement',
        ]);
    }
    async getWallet() {
        const localchainBalance = (await this.localchainPaymentService?.getWallet()) ?? {
            credits: [],
            formattedBalance: '0',
            primaryAddress: '',
            accounts: [],
        };
        const credits = await this.credits();
        const creditBalance = credits.reduce((sum, x) => sum + x.remaining, 0);
        const creditMilligons = ArgonUtils_1.default.microgonsToMilligons(creditBalance);
        const formattedBalance = ArgonUtils_1.default.format((localchainBalance.accounts[0]?.balance ?? 0n) + creditMilligons, 'milligons', 'argons');
        return {
            primaryAddress: await this.localchainPaymentService.localchain.address,
            credits,
            accounts: localchainBalance.accounts,
            formattedBalance,
        };
    }
    async credits() {
        const credits = [];
        for (const services of Object.values(this.creditsByDatastoreId) ?? []) {
            credits.push(...services.map(x => x.credit));
        }
        return credits;
    }
    async loadCredits(path) {
        if (this.creditsAutoLoaded) {
            if (!path || path === this.creditsPath)
                return this.creditsAutoLoaded;
        }
        path ??= this.creditsPath;
        const credits = await CreditPaymentService_1.default.loadAll(path);
        for (const credit of credits) {
            this.addCredit(credit);
        }
    }
    async getDatastoreHostLookup() {
        const mainchainClient = await this.localchainPaymentService?.localchain?.mainchainClient;
        if (mainchainClient) {
            return new DatastoreLookup_1.default(mainchainClient);
        }
        return null;
    }
    addCredit(service) {
        this.creditsByDatastoreId[service.datastoreId] ??= [];
        this.creditsByDatastoreId[service.datastoreId].push(service);
        service.addEventEmitter(this, ['reserved', 'finalized']);
    }
    async close() {
        for (const services of Object.values(this.creditsByDatastoreId) ?? []) {
            await Promise.allSettled(services.map(x => x.close()));
        }
        await this.localchainPaymentService?.close();
    }
    async attachCredit(url, credit, datastoreLookup) {
        const service = await CreditPaymentService_1.default.lookup(url, credit, datastoreLookup ?? (await this.getDatastoreHostLookup()), this.creditsPath);
        this.addCredit(service);
    }
    async whitelistRemotes(manifest, datastoreLookup) {
        if (!manifest.remoteDatastores)
            return;
        await this.localchainPaymentService?.whitelistRemotes(manifest, datastoreLookup);
        for (const [remoteSource, datastoreUrl] of Object.entries(manifest.remoteDatastores)) {
            const credit = manifest.remoteDatastoreEmbeddedCredits[remoteSource];
            if (credit) {
                const service = await CreditPaymentService_1.default.lookup(datastoreUrl, credit, datastoreLookup, this.creditsPath);
                this.addCredit(service);
            }
        }
    }
    async reserve(info) {
        if (!info.microgons || !info.recipient)
            return null;
        await this.creditsAutoLoaded;
        let datastoreCredits = 0;
        for (const credit of this.creditsByDatastoreId[info.id] ?? []) {
            datastoreCredits += 1;
            if (credit.hasBalance(info.microgons)) {
                const payment = await credit.reserve(info);
                if (payment) {
                    this.paymentUuidToService[payment.uuid] = new WeakRef(credit);
                    return payment;
                }
            }
        }
        if (!this.localchainPaymentService) {
            if (datastoreCredits > 0) {
                throw new Error(`Your datastore credit${datastoreCredits > 1} don't have enough remaining funds. Connect another payment source to continue.`);
            }
            throw new Error("You don't have any valid payment methods configured. Please install any credits you have or connect a localchain.");
        }
        const payment = await this.localchainPaymentService?.reserve(info);
        if (payment) {
            this.paymentUuidToService[payment.uuid] = new WeakRef(this.localchainPaymentService);
        }
        return payment;
    }
    async finalize(info) {
        const service = this.paymentUuidToService[info.uuid]?.deref();
        delete this.paymentUuidToService[info.uuid];
        await service?.finalize(info);
    }
}
exports.default = LocalPaymentService;
//# sourceMappingURL=LocalPaymentService.js.map