"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeerDistanceList = void 0;
const bufferUtils_1 = require("@ulixee/commons/lib/bufferUtils");
const Kad_1 = require("./Kad");
/**
 * Maintains a list of nodeIds sorted by distance from a DHT key.
 */
class PeerDistanceList {
    constructor(originDhtKey, capacity) {
        this.originDhtKey = originDhtKey;
        this.capacity = capacity;
        this.peerDistances = [];
        this.nodeIdToKadId = this.nodeIdToKadId.bind(this);
    }
    /**
     * The length of the list
     */
    get length() {
        return this.peerDistances.length;
    }
    /**
     * The nodeIds in the list, in order of distance from the origin key
     */
    get peers() {
        return this.peerDistances.map(pd => pd.nodeId);
    }
    /**
     * Add a nodeId to the list.
     */
    add(nodeId) {
        if (this.peerDistances.some(pd => pd.nodeId === nodeId)) {
            return;
        }
        const kadId = this.nodeIdToKadId(nodeId);
        const el = {
            nodeId,
            distance: (0, bufferUtils_1.xor)(this.originDhtKey, kadId),
        };
        this.peerDistances.push(el);
        this.peerDistances.sort((a, b) => Buffer.compare(a.distance, b.distance));
        this.peerDistances = this.peerDistances.slice(0, this.capacity);
    }
    /**
     * Indicates whether any of the nodeIds passed as a parameter are closer
     * to the origin key than the furthest nodeId in the PeerDistanceList.
     */
    anyCloser(nodeIds) {
        if (nodeIds.length === 0) {
            return false;
        }
        if (this.length === 0) {
            return true;
        }
        const dhtKeys = nodeIds.map(this.nodeIdToKadId);
        const furthestDistance = this.peerDistances[this.peerDistances.length - 1].distance;
        for (const dhtKey of dhtKeys) {
            const keyDistance = (0, bufferUtils_1.xor)(this.originDhtKey, dhtKey);
            if (Buffer.compare(keyDistance, furthestDistance) < 0) {
                return true;
            }
        }
        return false;
    }
    // embedded in a function so it can be overridden
    nodeIdToKadId(nodeId) {
        return (0, Kad_1.nodeIdToKadId)(nodeId);
    }
}
exports.PeerDistanceList = PeerDistanceList;
//# sourceMappingURL=PeerDistanceList.js.map