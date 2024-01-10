"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const KadApiHandler_1 = require("./KadApiHandler");
exports.default = new KadApiHandler_1.default('Kad.findProviders', {
    async handler({ key }, context) {
        const { connection, kad } = context;
        const { providers, peerRouting, peerStore } = kad;
        const peerNodeInfo = connection.nodeInfo;
        const closerPeers = peerRouting.getCloserPeersOffline(key, kad.nodeInfo.nodeId, peerNodeInfo.nodeId);
        const localProviders = providers.getProviders(key);
        const providerPeers = [];
        for (const nodeId of localProviders) {
            // don't tell them about themselves
            if (nodeId === peerNodeInfo.nodeId)
                continue;
            const nodeInfo = peerStore.get(nodeId);
            if (nodeInfo)
                providerPeers.push(nodeInfo);
        }
        return {
            providerPeers,
            closerPeers,
        };
    },
});
//# sourceMappingURL=Kad.findProviders.js.map