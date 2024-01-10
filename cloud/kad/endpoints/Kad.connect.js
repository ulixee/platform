"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nanoid_1 = require("nanoid");
const KadApiHandler_1 = require("./KadApiHandler");
exports.default = new KadApiHandler_1.default('Kad.connect', {
    async handler({ nodeInfo, presharedNonce, connectToNodeId }, context) {
        if (connectToNodeId && connectToNodeId !== context.kad.nodeInfo.nodeId) {
            throw new Error(`The requested nodeId (${connectToNodeId}) is not hosted here`);
        }
        context.connection.nodeInfo = nodeInfo;
        context.connection.presharedNonce = presharedNonce;
        const nonce = (0, nanoid_1.nanoid)(18);
        context.connection.ourNonce = nonce;
        context.kad.peerStore.add(nodeInfo);
        context.logger.boundContext ??= {};
        context.logger.boundContext.remoteNodeId = nodeInfo.nodeId;
        return {
            nonce,
            nodeInfo: { ...context.kad.nodeInfo, lastSeenDate: undefined },
        };
    },
});
//# sourceMappingURL=Kad.connect.js.map