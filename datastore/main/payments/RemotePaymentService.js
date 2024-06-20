"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bufferUtils_1 = require("@ulixee/commons/lib/bufferUtils");
const hashUtils_1 = require("@ulixee/commons/lib/hashUtils");
const nanoid_1 = require("nanoid");
const CreditPaymentService_1 = require("./CreditPaymentService");
class RemotePaymentService {
    constructor(connectionToCore) {
        this.connectionToCore = connectionToCore;
        /**
         * This stores credits that are controlled on the local machine. It should not be used in a shared environment like a CloudNode.
         */
        this.localCreditsByDatastoreId = {};
        this.loadedDatastoreIds = new Set();
        this.creditPaymentUuidToDatastoreId = {};
    }
    async loadLocalCredits() {
        const credits = await CreditPaymentService_1.default.loadAll();
        for (const credit of credits) {
            this.localCreditsByDatastoreId[credit.datastoreId] ??= [];
            this.localCreditsByDatastoreId[credit.datastoreId].push(credit);
        }
    }
    async attachCredit(datastoreUrl, credit, datastoreLookup) {
        const service = await CreditPaymentService_1.default.lookup(datastoreUrl, credit, datastoreLookup);
        this.localCreditsByDatastoreId[service.datastoreId] ??= [];
        this.localCreditsByDatastoreId[service.datastoreId].push(service);
    }
    async whitelistRemotes(datastoreMetadata, datastoreLookup) {
        if (this.loadedDatastoreIds.has(datastoreMetadata.id))
            return;
        this.loadedDatastoreIds.add(datastoreMetadata.id);
        this.whitelistedDatastoreIds ??= new Set();
        for (const datastoreUrl of Object.values(datastoreMetadata.remoteDatastores)) {
            const datastoreHost = await datastoreLookup.getHostInfo(datastoreUrl);
            this.whitelistedDatastoreIds.add({ id: datastoreHost.datastoreId, host: datastoreHost.host });
        }
    }
    async authenticate(identity) {
        const nonce = (0, nanoid_1.nanoid)(10);
        const message = RemotePaymentService.getMessage(identity.bech32, nonce);
        const auth = await this.connectionToCore.sendRequest({
            command: 'PaymentService.authenticate',
            args: [
                {
                    authentication: {
                        identity: identity.bech32,
                        signature: identity.sign(message),
                        nonce,
                    },
                },
            ],
        });
        this.authenticationToken = auth.authenticationToken;
    }
    async reserve(info) {
        if (!info.microgons || !info.recipient)
            return null;
        if (this.whitelistedDatastoreIds &&
            !this.whitelistedDatastoreIds.has({ id: info.id, host: info.host }))
            throw new Error('This datastore id is not loaded');
        const credits = this.localCreditsByDatastoreId[info.id];
        if (credits) {
            for (const credit of credits) {
                if (credit.hasBalance(info.microgons)) {
                    return credit.reserve(info);
                }
            }
        }
        return await this.connectionToCore.sendRequest({
            command: 'PaymentService.reserve',
            args: [{ ...info, authenticationToken: this.authenticationToken }],
        });
    }
    async finalize(info) {
        const datastoreId = this.creditPaymentUuidToDatastoreId[info.uuid];
        if (datastoreId) {
            delete this.creditPaymentUuidToDatastoreId[info.uuid];
            for (const credit of this.localCreditsByDatastoreId[datastoreId]) {
                if (credit.canFinalize(info.uuid)) {
                    return credit.finalize(info);
                }
            }
        }
        await this.connectionToCore.sendRequest({
            command: 'PaymentService.finalize',
            args: [{ ...info, authenticationToken: this.authenticationToken }],
        });
    }
    static getMessage(identity, nonce) {
        return (0, hashUtils_1.sha256)((0, bufferUtils_1.concatAsBuffer)('PaymentService.authenticate', identity, nonce));
    }
}
exports.default = RemotePaymentService;
//# sourceMappingURL=RemotePaymentService.js.map