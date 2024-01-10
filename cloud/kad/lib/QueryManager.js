"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryManager = void 0;
const IPendingWaitEvent_1 = require("@ulixee/commons/interfaces/IPendingWaitEvent");
const bufferUtils_1 = require("@ulixee/commons/lib/bufferUtils");
const errors_1 = require("@ulixee/commons/lib/errors");
const Logger_1 = require("@ulixee/commons/lib/Logger");
const Queue_1 = require("@ulixee/commons/lib/Queue");
const Signals_1 = require("@ulixee/commons/lib/Signals");
const TypedEventEmitter_1 = require("@ulixee/commons/lib/TypedEventEmitter");
const node_events_1 = require("node:events");
const Kad_1 = require("./Kad");
const constants_1 = require("./constants");
const MAX_XOR = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
const log = (0, Logger_1.default)(module).log;
/**
 * Keeps track of all running queries
 */
class QueryManager {
    constructor(kad, init) {
        this.kad = kad;
        this.activeQueries = 0;
        this.queryIdCounter = 0;
        const { disjointPaths = constants_1.K, alpha = constants_1.ALPHA } = init;
        this.disjointPaths = disjointPaths ?? constants_1.K;
        this.running = false;
        this.alpha = alpha ?? constants_1.ALPHA;
        this.initialQuerySelfHasRun = init.initialQuerySelfHasRun;
        this.routingTable = init.routingTable;
        // allow us to stop queries on shut down
        this.shutDownController = new AbortController();
        // make sure we don't make a lot of noise in the logs
        (0, node_events_1.setMaxListeners)(Infinity, this.shutDownController.signal);
    }
    isStarted() {
        return this.running;
    }
    async start() {
        this.running = true;
    }
    async stop() {
        this.running = false;
        this.shutDownController.abort();
    }
    async *runOnClosestPeers(key, queryFunc, options = {}) {
        if (!this.running) {
            throw new Error('QueryManager not started');
        }
        const signals = [
            this.shutDownController.signal,
            options.signal ?? Signals_1.default.timeout(constants_1.DEFAULT_QUERY_TIMEOUT),
        ];
        if (options?.queryTimeout) {
            signals.push(Signals_1.default.timeout(options.queryTimeout));
        }
        const signal = Signals_1.default.any(...signals);
        (0, node_events_1.setMaxListeners)(Infinity, signal);
        this.queryIdCounter++;
        const queryId = this.queryIdCounter;
        const logger = log.createChild(module, { key, queryId });
        // query a subset of peers up to `kBucketSize / 2` in length
        const parentLogId = logger.stats('Query:start');
        if (options.isSelfQuery !== true && !this.initialQuerySelfHasRun.isResolved) {
            logger.stats('Query:waitFor(query-self)', options);
            await Promise.race([
                new Promise((_resolve, reject) => {
                    signal.addEventListener('abort', () => {
                        reject(new errors_1.AbortError('Query was aborted before self-query ran'));
                    });
                }),
                this.initialQuerySelfHasRun.promise,
            ]);
        }
        const cleanUp = new TypedEventEmitter_1.default();
        try {
            this.activeQueries++;
            // perform lookups on kadId, not the actual value
            const peers = this.routingTable.closestPeers(key);
            const peersToQuery = peers.slice(0, Math.min(this.disjointPaths, peers.length));
            if (peers.length === 0) {
                logger.error('Query:no-peers');
                return;
            }
            // make sure we don't get trapped in a loop
            const peersSeen = new Set();
            // Only ALPHA node/value lookups are allowed at any given time for each process
            const queue = new Queue_1.default('QUERY PATH', this.alpha, signal);
            const queryOptions = {
                signal,
                key,
                query: queryFunc,
                queryTimeout: options.queryTimeout,
                cleanUp,
                isSelfQuery: false,
                logger: log,
                peersSeen,
                startStack: new Error('').stack.slice(8),
            };
            // Create query paths from the starting peers
            for (const peer of peersToQuery) {
                if (!peer || peersSeen.has(peer) || peer === this.kad.nodeId)
                    continue;
                const nodeInfo = this.kad.peerStore.get(peer);
                this.queueQueryPeer(queue, nodeInfo, queryOptions);
            }
            // Execute the query along each disjoint path and yield their results as they become available
            for await (const result of queue.toGenerator(cleanUp)) {
                yield result;
            }
        }
        catch (error) {
            if (error instanceof IPendingWaitEvent_1.CanceledPromiseError) {
                // ignore all canceled errors.
            }
            else if (!this.running &&
                (error.code === 'ERR_QUERY_ABORTED' ||
                    error.code === 'ABORT_ERR' ||
                    error.code === 'ERR_DB_CLOSED')) {
                // ignore query aborted errors that were thrown during query manager shutdown
            }
            else {
                throw error;
            }
        }
        finally {
            signal.clear();
            this.activeQueries--;
            cleanUp.emit('cleanup');
            logger.stats('Query:done', { parentLogId });
        }
    }
    /**
     * Walks a path through the DHT, calling the passed query function for
     * every peer encountered that we have not seen before
     *
     * Adds the passed peer to the query queue if it's not us and no
     * other path has passed through this peer
     */
    queueQueryPeer(queue, peerNodeInfo, options) {
        const { logger, signal, query, key, peersSeen } = options;
        const peerNodeId = peerNodeInfo?.nodeId;
        if (!peerNodeInfo || peersSeen.has(peerNodeId) || peerNodeId === this.kad.nodeId)
            return;
        peersSeen.add(peerNodeId);
        const peerKadId = (0, Kad_1.nodeIdToKadId)(peerNodeId);
        const peerXor = (0, bufferUtils_1.bufferToBigInt)((0, bufferUtils_1.xor)(peerKadId, key));
        queue
            .run(async () => {
            let result = await query({
                key,
                nodeInfo: peerNodeInfo,
                signal,
            }).catch(err => {
                return {
                    error: err,
                    closerPeers: undefined,
                };
            });
            result ??= {};
            // if there are closer peers and the query has not completed, continue the query
            for (const closerPeer of result.closerPeers ?? []) {
                if (options.peersSeen.has(closerPeer.nodeId)) {
                    logger.stats('Query:alreadySeen', { nodeId: closerPeer.nodeId });
                    continue;
                }
                if (this.kad.nodeId === closerPeer.nodeId) {
                    continue;
                }
                const closerPeerKadId = (0, Kad_1.nodeIdToKadId)(closerPeer.nodeId);
                const closerPeerXor = (0, bufferUtils_1.bufferToBigInt)((0, bufferUtils_1.xor)(closerPeerKadId, key));
                // only continue query if closer peer is actually closer
                if (closerPeerXor > peerXor) {
                    logger.stats('Query:peerNotCloser', {
                        closerPeer: closerPeer.nodeId,
                        closerPeerDistance: closerPeerXor,
                        nodeId: peerNodeId,
                        distance: peerXor,
                    });
                    continue;
                }
                logger.stats('Query:queuePeer', { nodeId: closerPeer.nodeId });
                this.queueQueryPeer(queue, closerPeer, options);
            }
            return { ...result, fromNodeId: peerNodeId };
        }, {
            // use xor value as the queue priority - closer peers should execute first
            // subtract it from MAX_XOR because higher priority values execute sooner
            priority: MAX_XOR - peerXor,
        })
            .catch(error => {
            // ignore discarded items
            if (error instanceof IPendingWaitEvent_1.CanceledPromiseError)
                return;
            if (!this.running || options.isSelfQuery)
                return;
            error.stack += `\n  ${options.startStack}`;
            logger.error(`queueQueryPeer:Error`, { error });
        });
    }
}
exports.QueryManager = QueryManager;
//# sourceMappingURL=QueryManager.js.map