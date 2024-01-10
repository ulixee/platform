"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hashUtils_1 = require("@ulixee/commons/lib/hashUtils");
const Resolvable_1 = require("@ulixee/commons/lib/Resolvable");
const utils_1 = require("@ulixee/commons/lib/utils");
const errors_1 = require("@ulixee/crypto/lib/errors");
const Identity_1 = require("@ulixee/crypto/lib/Identity");
const net_1 = require("@ulixee/net");
const nanoid_1 = require("nanoid");
const ConnectionToKadClient_1 = require("./ConnectionToKadClient");
class ConnectionToKadCore extends net_1.ConnectionToCore {
    constructor(kad, transportToCore) {
        super(transportToCore);
        this.kad = kad;
    }
    async connectAndVerify(connectToNodeId, timeoutMs = 5e3) {
        if (this.verifiedPromise)
            return this.verifiedPromise;
        const resolvable = new Resolvable_1.default();
        this.verifiedPromise = resolvable;
        try {
            await super.connect(true, timeoutMs);
            const presharedNonce = (0, nanoid_1.nanoid)(18);
            const { nonce, nodeInfo } = await this.sendRequest({
                command: 'Kad.connect',
                args: [
                    {
                        nodeInfo: this.kad.nodeInfo,
                        presharedNonce,
                        connectToNodeId,
                    },
                ],
            });
            await this.kad.peerStore.add(nodeInfo, false);
            this.nodeInfo = nodeInfo;
            // TODO: only need to verify if information changes
            if (connectToNodeId && nodeInfo.nodeId !== connectToNodeId) {
                throw new Error('Invalid nodeId returned.');
            }
            // sha256([presharedNonce, nonce, connector nodeId, host nodeId])
            const signatureMessage = (0, hashUtils_1.sha256)(`${[presharedNonce, nonce, this.kad.nodeInfo.nodeId, nodeInfo.nodeId].join('_')}`);
            const { signature } = await this.sendRequest({
                command: 'Kad.verify',
                args: [{ signature: this.kad.identity.sign(signatureMessage) }],
            });
            const isValid = Identity_1.default.verify(connectToNodeId, signatureMessage, signature);
            if (!isValid)
                throw new errors_1.InvalidSignatureError(`Failed node verification process`);
            await this.kad.peerStore.nodeVerified(nodeInfo.nodeId);
            resolvable.resolve(null);
        }
        catch (error) {
            resolvable.reject(error);
        }
        return this.verifiedPromise.promise;
    }
    toClient() {
        const connection = new ConnectionToKadClient_1.default(this.kad, this.transport);
        connection.verifiedPromise = this.verifiedPromise;
        void this.verifiedPromise.then(() => (connection.nodeInfo = this.nodeInfo));
        return connection;
    }
    static fromClient(kad, client) {
        const connection = new ConnectionToKadCore(kad, client.transport);
        connection.verifiedPromise = client.verifiedPromise;
        void client.verifiedPromise.then(() => (connection.nodeInfo = client.nodeInfo));
        return connection;
    }
    static parseUrl(address) {
        const url = (0, utils_1.toUrl)(address);
        url.pathname = '/kad';
        return url.href;
    }
}
exports.default = ConnectionToKadCore;
//# sourceMappingURL=ConnectionToKadCore.js.map