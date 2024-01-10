"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const KadApiHandler_1 = require("./KadApiHandler");
exports.default = new KadApiHandler_1.default('Kad.get', {
    async handler(msg, context) {
        const { connection, kad, logger } = context;
        const peerNodeInfo = connection.nodeInfo;
        const key = msg.key;
        logger.stats('Kad.get', {
            key,
            peerKadHost: peerNodeInfo.kadHost,
            peerNodeId: peerNodeInfo.nodeId,
        });
        const [record, closerPeers] = await Promise.all([
            kad.db.records.getIfNotExpired(key),
            kad.peerRouting.getCloserPeersOffline(key, kad.nodeInfo.nodeId, peerNodeInfo.nodeId),
        ]);
        if (record) {
            delete record.isOwnRecord;
            delete record.receivedTimestamp;
            delete record.key;
        }
        return { record, closerPeers };
    },
});
//# sourceMappingURL=Kad.get.js.map