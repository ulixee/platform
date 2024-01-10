"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sidechain_1 = require("@ulixee/sidechain");
const errors_1 = require("@ulixee/crypto/lib/errors");
const errors_2 = require("@ulixee/sidechain/lib/errors");
const Resolvable_1 = require("@ulixee/commons/lib/Resolvable");
class SidechainClientManager {
    constructor(options) {
        this.options = options;
        this.sidechainClientsByIdentity = {};
        this.options ??= {};
        this.withIdentity = this.withIdentity.bind(this);
    }
    get defaultClient() {
        if (!this.options.defaultSidechainHost) {
            return null;
        }
        this._defaultClient ??= this.createSidechainClient(this.options.defaultSidechainHost);
        return this._defaultClient;
    }
    async withIdentity(rootIdentity) {
        const client = this.sidechainClientsByIdentity[rootIdentity];
        if (client)
            return client;
        const approvedSidechains = await this.getApprovedSidechainsByIdentity();
        const sidechain = approvedSidechains[rootIdentity];
        if (!sidechain)
            throw new errors_2.UnapprovedSidechainError(`The requested Sidechain (${rootIdentity}) is not approved by your configured default approved Sidechains list.`);
        return (this.sidechainClientsByIdentity[rootIdentity] ??= this.createSidechainClient(sidechain.url));
    }
    async getApprovedSidechainRootIdentities() {
        return new Set(Object.keys(await this.getApprovedSidechainsByIdentity()));
    }
    async getApprovedSidechainsByIdentity() {
        if (this._approvedSidechainsResolvable)
            return this._approvedSidechainsResolvable.promise;
        this._approvedSidechainsResolvable = new Resolvable_1.default();
        if (this.options.approvedSidechains?.length) {
            const approved = SidechainClientManager.parseApprovedSidechains(this.options.approvedSidechains);
            this._approvedSidechainsResolvable.resolve(approved);
            return this._approvedSidechainsResolvable;
        }
        try {
            const settings = await this.defaultClient.getSettings(true);
            if (this.options.defaultSidechainRootIdentity &&
                !settings.rootIdentities.includes(this.options.defaultSidechainRootIdentity)) {
                throw new errors_1.InvalidIdentityError(`The root identity of the Sidechain you've connected to does not match your configuration. Please verify and restart this machine!`);
            }
            for (const identity of settings.rootIdentities) {
                this.sidechainClientsByIdentity[identity] = this.defaultClient;
            }
            const approved = SidechainClientManager.parseApprovedSidechains(settings.latestBlockSettings.sidechains);
            this._approvedSidechainsResolvable.resolve(approved);
        }
        catch (error) {
            this._approvedSidechainsResolvable.reject(error);
        }
        if (this.options.approvedSidechainsRefreshInterval) {
            this.refreshApprovedSidechainsInterval = setTimeout(() => (this._approvedSidechainsResolvable = null), this.options.approvedSidechainsRefreshInterval).unref();
        }
        return this._approvedSidechainsResolvable;
    }
    createSidechainClient(host) {
        if (!this.options.identityWithSidechain)
            throw new Error("This DatastoreCore wasn't supplied with an Identity. Without an Identity, it cannot interact with the Ulixee Sidechain for payments.");
        return new sidechain_1.default(host, {
            identity: this.options.identityWithSidechain,
        }, true);
    }
    static parseApprovedSidechains(sidechains) {
        const approved = {};
        for (const sidechain of sidechains) {
            approved[sidechain.rootIdentity] = sidechain;
        }
        return approved;
    }
}
exports.default = SidechainClientManager;
//# sourceMappingURL=SidechainClientManager.js.map