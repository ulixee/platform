"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuerySelf = void 0;
const Logger_1 = require("@ulixee/commons/lib/Logger");
const Resolvable_1 = require("@ulixee/commons/lib/Resolvable");
const Signals_1 = require("@ulixee/commons/lib/Signals");
const node_events_1 = require("node:events");
const constants_1 = require("./constants");
const { log } = (0, Logger_1.default)(module);
/**
 * Receives notifications of new peers joining the network that support the DHT protocol
 */
class QuerySelf {
    constructor(kad, init) {
        this.kad = kad;
        const { count, interval, queryTimeout } = init;
        this.logger = log.createChild(module, { nodeId: kad.nodeId });
        this.started = false;
        this.count = count ?? constants_1.K;
        this.interval = interval ?? constants_1.QUERY_SELF_INTERVAL;
        this.initialInterval = init.initialInterval ?? constants_1.QUERY_SELF_INITIAL_INTERVAL;
        this.queryTimeout = queryTimeout ?? constants_1.QUERY_SELF_TIMEOUT;
        this.initialQuerySelfHasRun = init.initialQuerySelfHasRun;
    }
    isStarted() {
        return this.started;
    }
    async start() {
        if (this.started) {
            return;
        }
        this.started = true;
        this.schedule();
    }
    async stop() {
        this.started = false;
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
        }
        this.controller?.abort();
    }
    async querySelf() {
        if (!this.started)
            return;
        if (this.querySelfPromise) {
            return this.querySelfPromise.promise;
        }
        this.querySelfPromise = new Resolvable_1.default();
        if (this.kad.routingTable.size === 0) {
            await new Promise(resolve => this.kad.routingTable.kb.once('peer:add', resolve));
        }
        if (this.started) {
            this.controller = new AbortController();
            const signal = Signals_1.default.any(this.controller.signal, Signals_1.default.timeout(this.queryTimeout));
            // this controller will get used for lots of dial attempts so make sure we don't cause warnings to be logged
            (0, node_events_1.setMaxListeners)(Infinity, signal);
            const parentLogId = this.logger.info(`querySelf.run(x/${this.count})`, {
                searchForPeers: this.count,
                timeout: this.queryTimeout,
            });
            try {
                let found = 0;
                const nodeKadId = this.kad.nodeInfo.kadId;
                for await (const _ of this.kad.peerRouting.getClosestPeers(nodeKadId, {
                    signal,
                    isSelfQuery: true,
                })) {
                    found += 1;
                    if (found === this.count) {
                        this.controller.abort();
                        break;
                    }
                }
                this.logger.stats(`querySelf.complete(${found}/${this.count})`, {
                    peersFound: found,
                    parentLogId,
                });
                this.initialQuerySelfHasRun?.resolve();
            }
            catch (error) {
                if (this.started && error.code !== 'ERR_QUERY_ABORTED') {
                    this.logger.error('querySelf.error', { error, parentLogId });
                }
            }
            finally {
                signal.clear();
            }
        }
        this.controller = null;
        this.querySelfPromise.resolve();
        this.querySelfPromise = null;
        if (!this.started) {
            return;
        }
        this.schedule();
    }
    schedule() {
        clearTimeout(this.timeoutId);
        this.timeoutId = setTimeout(() => this.querySelf().catch(error => {
            if (this.started && error.code !== 'ERR_QUERY_ABORTED') {
                this.logger.error('QuerySelfError', { error });
            }
        }), this.initialInterval);
    }
}
exports.QuerySelf = QuerySelf;
//# sourceMappingURL=QuerySelf.js.map