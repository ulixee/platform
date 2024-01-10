"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutingTable = exports.PING_CONCURRENCY = exports.PING_TIMEOUT = exports.KBUCKET_SIZE = exports.KAD_CLOSE_TAG_VALUE = exports.KAD_CLOSE_TAG_NAME = void 0;
const IPendingWaitEvent_1 = require("@ulixee/commons/interfaces/IPendingWaitEvent");
const asyncUtils_1 = require("@ulixee/commons/lib/asyncUtils");
const Logger_1 = require("@ulixee/commons/lib/Logger");
const Queue_1 = require("@ulixee/commons/lib/Queue");
const Signals_1 = require("@ulixee/commons/lib/Signals");
const TypedEventEmitter_1 = require("@ulixee/commons/lib/TypedEventEmitter");
const KBucket = require("k-bucket");
const Kad_1 = require("./Kad");
exports.KAD_CLOSE_TAG_NAME = 'kad-close';
exports.KAD_CLOSE_TAG_VALUE = 50;
exports.KBUCKET_SIZE = 20;
exports.PING_TIMEOUT = 10000;
exports.PING_CONCURRENCY = 10;
/**
 * A wrapper around `k-bucket`, to provide easy store and
 * retrieval for peers.
 */
class RoutingTable extends TypedEventEmitter_1.default {
    constructor(kad, init) {
        super();
        this.kad = kad;
        this.kb = null;
        this.closestNodeIds = new Set();
        const { kBucketSize, pingTimeout, pingConcurrency, tagName, tagValue } = init;
        this.logger = (0, Logger_1.default)(module).log;
        this.kBucketSize = kBucketSize ?? exports.KBUCKET_SIZE;
        this.pingTimeout = pingTimeout ?? exports.PING_TIMEOUT;
        this.pingConcurrency = pingConcurrency ?? exports.PING_CONCURRENCY;
        this.running = false;
        this.tagName = tagName ?? exports.KAD_CLOSE_TAG_NAME;
        this.tagValue = tagValue ?? exports.KAD_CLOSE_TAG_VALUE;
        this.pingQueue = new Queue_1.default('KAD PING', this.pingConcurrency);
        this.onPing = this.onPing.bind(this);
        this.updatePeerTags = (0, asyncUtils_1.debounce)(this.updatePeerTags.bind(this), 0);
        this.onPeerAdded = this.onPeerAdded.bind(this);
        this.onPeerRemoved = this.onPeerRemoved.bind(this);
    }
    isStarted() {
        return this.running;
    }
    async start() {
        this.running = true;
        this.kb = new KBucket({
            localNodeId: this.kad.nodeInfo.kadId,
            numberOfNodesPerKBucket: this.kBucketSize,
            numberOfNodesToPing: 1,
        });
        // test whether to evict peers
        this.kb.on('ping', this.onPing);
        this.kb.on('added', this.onPeerAdded);
        this.kb.on('removed', this.onPeerRemoved);
    }
    async stop() {
        if (!this.running)
            return;
        this.running = false;
        this.kb.off('ping', this.onPing);
        this.kb.off('added', this.onPeerAdded);
        this.kb.off('removed', this.onPeerRemoved);
        this.pingQueue.stop();
        this.kb = null;
    }
    // -- Public Interface
    /**
     * Amount of currently stored peers
     */
    get size() {
        if (!this.kb)
            return 0;
        return this.kb.count();
    }
    /**
     * Retrieve the `count`-closest peers to the given key
     */
    closestPeers(key, count = this.kBucketSize) {
        if (!this.kb)
            return [];
        return this.kb.closest(key, count).map(x => x.nodeId);
    }
    /**
     * Add or update the routing table with the given peer
     */
    add(nodeId) {
        if (!this.kb) {
            throw new Error('RoutingTable is not started');
        }
        // don't add self
        if (nodeId === this.kad.nodeInfo.nodeId)
            return;
        const id = (0, Kad_1.nodeIdToKadId)(nodeId);
        this.kb.add({ id, nodeId, vectorClock: Date.now() });
        this.logger.info('RoutingTable.add', { nodeId });
    }
    /**
     * Remove a given peer from the table
     */
    remove(nodeId) {
        if (!this.kb) {
            throw new Error('RoutingTable is not started');
        }
        const id = (0, Kad_1.nodeIdToKadId)(nodeId);
        this.kb.remove(id);
    }
    /**
     * Keep track of our k-closest peers and tag them in the peer store as such
     * - this will lower the chances that connections to them get closed when
     * we reach connection limits
     */
    updatePeerTags() {
        if (!this.kb)
            return;
        const newClosest = new Set();
        for (const peer of this.kb.closest(this.kb.localNodeId, exports.KBUCKET_SIZE)) {
            const id = peer.nodeId;
            newClosest.add(id);
            if (!this.closestNodeIds.has(id)) {
                this.kad.peerStore.tag(id, this.tagName, this.tagValue);
            }
        }
        for (const id of this.closestNodeIds) {
            if (!newClosest.has(id)) {
                this.kad.peerStore.tag(id, this.tagName, undefined);
            }
        }
        this.closestNodeIds = newClosest;
    }
    onPeerAdded(peer) {
        this.updatePeerTags();
        this.emit('peer:add', { nodeId: peer.nodeId });
    }
    onPeerRemoved(peer) {
        this.emit('peer:remove', { nodeId: peer.nodeId });
        this.updatePeerTags();
    }
    /**
     * Called on the `ping` event from `k-bucket` when a bucket is full
     * and cannot split.
     *
     * `oldContacts.length` is defined by the `numberOfNodesToPing` param
     * passed to the `k-bucket` constructor.
     *
     * `oldContacts` will not be empty and is the list of contacts that
     * have not been contacted for the longest.
     */
    onPing(oldContacts, newContact) {
        // add to a queue so multiple ping requests do not overlap and we don't
        // flood the network with ping requests if lots of newContact requests
        // are received
        void this.pingQueue.run(async () => {
            if (!this.running) {
                return;
            }
            let responded = 0;
            await Promise.allSettled(oldContacts.map(async (oldContact) => {
                if (!this.running)
                    return;
                if (oldContact.nodeId === this.kad.nodeInfo.nodeId)
                    return;
                try {
                    this.logger.info('RoutingTable.ping', { nodeId: oldContact.nodeId });
                    const nodeInfo = this.kad.peerStore.get(oldContact.nodeId);
                    await this.kad.network.sendRequest(nodeInfo, 'Kad.ping', undefined, {
                        signal: Signals_1.default.timeout(this.pingTimeout),
                    });
                    responded++;
                }
                catch (error) {
                    if (!this.running &&
                        (error.code === 'ERR_QUERY_ABORTED' ||
                            error.code === 'ABORT_ERR' ||
                            error.code === 'ERR_DB_CLOSED' ||
                            error instanceof IPendingWaitEvent_1.CanceledPromiseError)) {
                        return;
                    }
                    if (this.running && this.kb) {
                        // only evict peers if we are still running, otherwise we evict when dialing is
                        // cancelled due to shutdown in progress
                        this.logger.warn('RoutingTable.ping - could not ping peer. Evicting.', {
                            nodeId: oldContact.nodeId,
                            error,
                        });
                        this.kb.remove(oldContact.id);
                    }
                }
            }));
            if (this.running && responded < oldContacts.length && this.kb) {
                this.logger.info('RoutingTable.afterPing - newContact', { nodeId: newContact.nodeId });
                this.kb.add(newContact);
            }
        });
    }
}
exports.RoutingTable = RoutingTable;
//# sourceMappingURL=RoutingTable.js.map