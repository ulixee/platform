"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _DefaultPaymentService_datastoreLookup;
Object.defineProperty(exports, "__esModule", { value: true });
const eventUtils_1 = require("@ulixee/commons/lib/eventUtils");
const localchain_1 = require("@ulixee/localchain");
const Identity_1 = require("@ulixee/platform-utils/lib/Identity");
const env_1 = require("../env");
const DatastoreLookup_1 = require("../lib/DatastoreLookup");
const ArgonReserver_1 = require("./ArgonReserver");
const BrokerEscrowSource_1 = require("./BrokerEscrowSource");
const CreditReserver_1 = require("./CreditReserver");
const LocalchainEscrowSource_1 = require("./LocalchainEscrowSource");
/**
 * A PaymentService that activates credits and includes an optional ArgonReserver
 */
class DefaultPaymentService extends eventUtils_1.TypedEventEmitter {
    constructor(argonReserver, loadCreditFromPath = 'default') {
        super();
        this.creditsByDatastoreId = {};
        this.creditsPath = CreditReserver_1.default.defaultBasePath;
        this.paymentUuidToService = {};
        _DefaultPaymentService_datastoreLookup.set(this, void 0);
        this.argonReserver = argonReserver;
        if (loadCreditFromPath) {
            this.creditsPath =
                loadCreditFromPath === 'default' ? CreditReserver_1.default.defaultBasePath : loadCreditFromPath;
            this.creditsAutoLoaded = this.loadCredits().catch(() => null);
        }
        this.argonReserver?.addEventEmitter(this, [
            'reserved',
            'finalized',
            'createdEscrow',
            'updateSettlement',
        ]);
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
        const credits = await CreditReserver_1.default.loadAll(path);
        for (const credit of credits) {
            this.addCredit(credit);
        }
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
        await this.argonReserver?.close();
    }
    async attachCredit(url, credit, datastoreLookup) {
        __classPrivateFieldSet(this, _DefaultPaymentService_datastoreLookup, __classPrivateFieldGet(this, _DefaultPaymentService_datastoreLookup, "f") ?? (datastoreLookup ?? (await this.argonReserver.datastoreLookup)), "f");
        if (!__classPrivateFieldGet(this, _DefaultPaymentService_datastoreLookup, "f") && env_1.default.mainchainUrl) {
            const mainchainClient = await localchain_1.MainchainClient.connect(env_1.default.mainchainUrl, 10e3);
            __classPrivateFieldSet(this, _DefaultPaymentService_datastoreLookup, new DatastoreLookup_1.default(mainchainClient), "f");
        }
        const service = await CreditReserver_1.default.lookup(url, credit, __classPrivateFieldGet(this, _DefaultPaymentService_datastoreLookup, "f"), this.creditsPath);
        this.addCredit(service);
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
        if (!this.argonReserver) {
            if (datastoreCredits > 0) {
                throw new Error(`Your datastore credit${datastoreCredits > 1} don't have enough remaining funds. Connect another payment source to continue.`);
            }
            throw new Error("You don't have any valid payment methods configured. Please install any credits you have or connect a localchain.");
        }
        const payment = await this.argonReserver?.reserve(info);
        if (payment) {
            this.paymentUuidToService[payment.uuid] = new WeakRef(this.argonReserver);
        }
        return payment;
    }
    async finalize(info) {
        const service = this.paymentUuidToService[info.uuid]?.deref();
        delete this.paymentUuidToService[info.uuid];
        await service?.finalize(info);
    }
    static async fromLocalchain(localchain, escrowAllocationStrategy, apiClients, loadCreditsFromPath) {
        const escrowSource = new LocalchainEscrowSource_1.default(localchain, await localchain.address);
        const reserver = new ArgonReserver_1.default(escrowSource, escrowAllocationStrategy, apiClients);
        await reserver.load();
        return new DefaultPaymentService(reserver, loadCreditsFromPath);
    }
    static async fromBroker(brokerHost, identityConfig, escrowAllocationStrategy, apiClients, loadCreditsFromPath) {
        const identity = Identity_1.default.loadFromFile(identityConfig.pemPath, identityConfig.passphrase ? { keyPassphrase: identityConfig.passphrase } : undefined);
        const escrowSource = new BrokerEscrowSource_1.default(brokerHost, identity);
        const reserver = new ArgonReserver_1.default(escrowSource, escrowAllocationStrategy, apiClients);
        await reserver.load();
        return new DefaultPaymentService(reserver, loadCreditsFromPath);
    }
}
_DefaultPaymentService_datastoreLookup = new WeakMap();
exports.default = DefaultPaymentService;
//# sourceMappingURL=DefaultPaymentService.js.map