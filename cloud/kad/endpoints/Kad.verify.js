"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hashUtils_1 = require("@ulixee/commons/lib/hashUtils");
const errors_1 = require("@ulixee/crypto/lib/errors");
const Identity_1 = require("@ulixee/crypto/lib/Identity");
const KadApiHandler_1 = require("./KadApiHandler");
exports.default = new KadApiHandler_1.default('Kad.verify', {
    async handler({ signature }, context) {
        const presharedNonce = context.connection.presharedNonce;
        const connectingNodeId = context.connection.nodeInfo.nodeId;
        const thisNodeId = context.kad.nodeInfo.nodeId;
        const signatureMessage = (0, hashUtils_1.sha256)(`${[presharedNonce, context.connection.ourNonce, connectingNodeId, thisNodeId].join('_')}`);
        const isValid = Identity_1.default.verify(connectingNodeId, signatureMessage, signature);
        if (!isValid)
            throw new errors_1.InvalidSignatureError(`Failed node verification process`);
        const oursignature = context.kad.identity.sign(signatureMessage);
        context.connection.verifiedPromise.resolve();
        context.kad.peerStore.nodeVerified(connectingNodeId);
        return { signature: oursignature };
    },
});
//# sourceMappingURL=Kad.verify.js.map