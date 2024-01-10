"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeerRouting = void 0;
const errors_1 = require("@ulixee/commons/lib/errors");
const Logger_1 = require("@ulixee/commons/lib/Logger");
const Signals_1 = require("@ulixee/commons/lib/Signals");
const Kad_1 = require("./Kad");
const PeerDistanceList_1 = require("./PeerDistanceList");
const { log } = (0, Logger_1.default)(module);
class PeerRouting {
    constructor(kad) {
        this.kad = kad;
        this.logger = log;
    }
    get routingTable() {
        return this.kad.routingTable;
    }
    get network() {
        return this.kad.network;
    }
    get queryManager() {
        return this.kad.queryManager;
    }
    /**
     * Search for a peer with the given ID
     */
    async *findPeer(id, options = {}) {
        this.logger.stats('findPeer', { nodeId: id });
        // Try to find locally
        const localNodeInfo = this.kad.peerStore.get(id);
        // already got it
        if (localNodeInfo) {
            this.logger.stats('findPeer:foundLocal', { nodeId: id, nodeInfo: localNodeInfo });
            yield {
                fromNodeId: this.kad.nodeInfo.nodeId,
                nodeInfo: localNodeInfo,
            };
            return;
        }
        let foundPeer = false;
        const key = (0, Kad_1.nodeIdToKadId)(id);
        const abortSignal = new AbortController();
        options.signal = options.signal
            ? Signals_1.default.any(abortSignal.signal, options.signal)
            : abortSignal.signal;
        for await (const result of this.queryManager.runOnClosestPeers(key, ({ nodeInfo, signal }) => {
            return this.network.sendRequest(nodeInfo, 'Kad.findNode', { key }, { signal });
        }, options)) {
            if (result.error) {
                this.logger.info('Error in findPeer for node', result);
                continue;
            }
            const match = result.closerPeers.find(p => p.nodeId === id);
            // found the peer
            if (match) {
                foundPeer = true;
                yield { fromNodeId: result.fromNodeId, nodeInfo: match };
                abortSignal.abort();
            }
        }
        if (!foundPeer) {
            throw new errors_1.CodeError('Not found', 'ERR_NOT_FOUND');
        }
    }
    /**
     * Kademlia 'node lookup' operation on a key, which should be a sha256 hash
     */
    async *getClosestPeers(key, options = {}) {
        this.logger.stats('getClosestPeers', { key });
        const distanceList = new PeerDistanceList_1.PeerDistanceList(key, this.routingTable.kBucketSize);
        for (const peer of this.routingTable.closestPeers(key))
            distanceList.add(peer);
        for await (const result of this.queryManager.runOnClosestPeers(key, ({ nodeInfo, signal }) => {
            return this.network.sendRequest(nodeInfo, 'Kad.findNode', { key }, { signal });
        }, options)) {
            if (result.error) {
                this.logger.info('Error in getClosestPeers for node', result);
                continue;
            }
            for (const peer of result.closerPeers) {
                if (peer.nodeId !== this.kad.nodeId)
                    distanceList.add(peer.nodeId);
            }
        }
        this.logger.stats('getClosestPeers:result', { found: distanceList.length, key });
        for (const nodeId of distanceList.peers) {
            const nodeInfo = this.kad.peerStore.get(nodeId);
            if (nodeInfo)
                yield nodeInfo;
        }
    }
    /**
     * Get the nearest peers to the given query, but closer than self
     */
    getCloserPeersOffline(key, closerThan, requestorNodeId) {
        const ids = this.routingTable.closestPeers(key);
        const closerPeers = [];
        for (const nodeId of ids) {
            if (nodeId === closerThan || nodeId === this.kad.nodeId || nodeId === requestorNodeId) {
                continue;
            }
            const nodeInfo = this.kad.peerStore.get(nodeId);
            if (nodeInfo)
                closerPeers.push(nodeInfo);
        }
        if (closerPeers.length > 0) {
            this.logger.info('getCloserPeersOffline:foundPeers', {
                key,
                closerPeers: closerPeers.length,
                closerThan,
            });
        }
        else {
            this.logger.info('getCloserPeersOffline:noneFound', {
                key,
                closerThan,
            });
        }
        return closerPeers;
    }
}
exports.PeerRouting = PeerRouting;
//# sourceMappingURL=PeerRouting.js.map