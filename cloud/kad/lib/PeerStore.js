"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeerStore = void 0;
const errors_1 = require("@ulixee/commons/lib/errors");
const eventUtils_1 = require("@ulixee/commons/lib/eventUtils");
class PeerStore extends eventUtils_1.TypedEventEmitter {
    constructor(db) {
        super();
        this.db = db;
        this.lastSeenByNodeId = {};
    }
    get(nodeId) {
        if (!this.db.isOpen)
            throw new errors_1.CodeError('Database not open', 'ERR_DB_CLOSED');
        const info = this.db.peers.get(nodeId);
        if (!info)
            return null;
        const { tags: _t, isVerified: _v, lastSeenDate: _l, ...nodeInfo } = info;
        return nodeInfo;
    }
    tag(nodeId, tagName, value) {
        if (!this.db.isOpen)
            throw new errors_1.CodeError('Database not open', 'ERR_DB_CLOSED');
        this.db.peers.updateTag(nodeId, tagName, value);
        if (value !== undefined)
            this.sawNode(nodeId);
    }
    all(includeLastSeen = false) {
        return this.db.peers
            .all()
            .map(x => {
            if (!x.isVerified)
                return null;
            const { nodeId, apiHost, lastSeenDate, kadHost } = x;
            const record = { nodeId, apiHost, kadHost };
            if (includeLastSeen)
                record.lastSeenDate = lastSeenDate;
            return record;
        })
            .filter(Boolean);
    }
    sawNode(nodeId) {
        this.lastSeenByNodeId[nodeId] = new Date();
    }
    nodeVerified(nodeId) {
        if (!this.db.isOpen)
            throw new errors_1.CodeError('Database not open', 'ERR_DB_CLOSED');
        this.db.peers.isVerified(nodeId, true);
    }
    add(nodeInfo, isVerified = false) {
        if (!this.lastSeenByNodeId[nodeInfo.nodeId])
            this.emit('new', nodeInfo);
        this.sawNode(nodeInfo.nodeId);
        if (!this.db.isOpen)
            throw new errors_1.CodeError('Database not open', 'ERR_DB_CLOSED');
        this.db.peers.record({
            ...nodeInfo,
            lastSeenDate: this.lastSeenByNodeId[nodeInfo.nodeId],
            isVerified,
            tags: {},
        });
    }
}
exports.PeerStore = PeerStore;
//# sourceMappingURL=PeerStore.js.map