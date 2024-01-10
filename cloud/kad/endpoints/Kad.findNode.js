"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const KadApiHandler_1 = require("./KadApiHandler");
exports.default = new KadApiHandler_1.default('Kad.findNode', {
    async handler({ key }, context) {
        const { kad, connection } = context;
        const { nodeInfo } = kad;
        let closerPeers = [];
        if (kad.nodeInfo.kadId === key) {
            closerPeers = [nodeInfo];
        }
        else {
            closerPeers = context.kad.peerRouting.getCloserPeersOffline(key, kad.nodeInfo.nodeId, connection.nodeInfo.nodeId);
        }
        return { closerPeers };
    },
});
//# sourceMappingURL=Kad.findNode.js.map