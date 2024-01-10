"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutingTableRefresh = void 0;
const IPendingWaitEvent_1 = require("@ulixee/commons/interfaces/IPendingWaitEvent");
const asyncUtils_1 = require("@ulixee/commons/lib/asyncUtils");
const bufferUtils_1 = require("@ulixee/commons/lib/bufferUtils");
const Logger_1 = require("@ulixee/commons/lib/Logger");
const Signals_1 = require("@ulixee/commons/lib/Signals");
const node_crypto_1 = require("node:crypto");
const constants_1 = require("./constants");
const generatedPrefixList_1 = require("./generatedPrefixList");
/**
 * Cannot generate random KadIds longer than this + 1
 */
const MAX_COMMON_PREFIX_LENGTH = 15;
/**
 * A wrapper around `k-bucket`, to provide easy store and
 * retrieval for peers.
 */
class RoutingTableRefresh {
    constructor(kad) {
        this.logger = (0, Logger_1.default)(module).log;
        this.peerRouting = kad.peerRouting;
        this.routingTable = kad.routingTable;
        this.refreshInterval = constants_1.TABLE_REFRESH_INTERVAL;
        this.refreshQueryTimeout = constants_1.TABLE_REFRESH_QUERY_TIMEOUT;
        this.commonPrefixLengthRefreshedAt = [];
        this.refreshTable = this.refreshTable.bind(this);
    }
    async start() {
        this.logger.info(`RoutingTableRefresh.start()`, { refreshInterval: this.refreshInterval });
        this.refreshTable(true);
    }
    async stop() {
        if (this.refreshTimeoutId !== null) {
            clearTimeout(this.refreshTimeoutId);
        }
    }
    /**
     * To speed lookups, we seed the table with random NodeIds. This means
     * when we are asked to locate a peer on the network, we can find a KadId
     * that is close to the requested peer ID and query that, then network
     * peers will tell us who they know who is close to the fake ID
     */
    refreshTable(force = false) {
        const prefixLength = this.maxCommonPrefix();
        const refreshCpls = this.getTrackedCommonPrefixLengthsForRefresh(prefixLength);
        const parentLogId = this.logger.info('refreshTable.Starting', {
            maxCommonPrefixLength: prefixLength,
            refreshDateByPrefixLength: refreshCpls,
        });
        /**
         * If we see a gap at a common prefix length in the Routing table, we ONLY refresh up until
         * the maximum cpl we have in the Routing Table OR (2 * (Cpl+ 1) with the gap), whichever
         * is smaller.
         *
         * This is to prevent refreshes for Cpls that have no peers in the network but happen to be
         * before a very high max Cpl for which we do have peers in the network.
         *
         * The number of 2 * (Cpl + 1) can be proved and a proof would have been written here if
         * the programmer had paid more attention in the Math classes at university.
         *
         * So, please be patient and a doc explaining it will be published soon.
         *
         * https://github.com/libp2p/go-libp2p-kad-dht/commit/2851c88acb0a3f86bcfe3cfd0f4604a03db801d8#diff-ad45f4ba97ffbc4083c2eb87a4420c1157057b233f048030d67c6b551855ccf6R219
         */
        void Promise.all(refreshCpls.map(async (lastRefresh, index) => {
            try {
                await this.refreshCommonPrefixLength(index, lastRefresh, force);
            }
            catch (error) {
                if (error.code === 'ERR_QUERY_ABORTED' ||
                    error.code === 'ABORT_ERR' ||
                    error.code === 'ERR_DB_CLOSED' ||
                    error instanceof IPendingWaitEvent_1.CanceledPromiseError)
                    return;
                this.logger.error('refreshCommonPrefixLength.base', { error });
            }
            if (this.numPeersForCpl(prefixLength) === 0) {
                const lastCpl = Math.min(2 * (index + 1), refreshCpls.length - 1);
                for (let n = index + 1; n < lastCpl + 1; n++) {
                    try {
                        await this.refreshCommonPrefixLength(n, lastRefresh, force);
                    }
                    catch (error) {
                        if (error.code === 'ERR_QUERY_ABORTED' ||
                            error.code === 'ABORT_ERR' ||
                            error.code === 'ERR_DB_CLOSED' ||
                            error instanceof IPendingWaitEvent_1.CanceledPromiseError)
                            return;
                        this.logger.error(`refreshCommonPrefixLength(${n})`, { error });
                    }
                }
            }
        })).finally(() => {
            this.refreshTimeoutId = setTimeout(this.refreshTable, this.refreshInterval).unref();
            this.logger.stats('refreshTable.Done', { parentLogId });
        });
    }
    async refreshCommonPrefixLength(commonPrefixLength, lastRefresh, force) {
        if (!force && lastRefresh.getTime() > Date.now() - this.refreshInterval) {
            return;
        }
        // gen a key for the query to refresh the cpl
        const kadKey = await this.generateRandomKadKey(commonPrefixLength);
        const parentLogId = this.logger.info(`refreshCommonPrefixLength:before`, {
            imaginaryKey: kadKey,
            commonPrefixLength,
            routingTableSize: this.routingTable.size,
        });
        const peers = await (0, asyncUtils_1.length)(this.peerRouting.getClosestPeers(kadKey, {
            signal: Signals_1.default.timeout(this.refreshQueryTimeout),
        }));
        this.logger.stats(`refreshCommonPrefixLength:after`, {
            imaginaryKey: kadKey,
            closestPeers: peers,
            commonPrefixLength,
            routingTableSize: this.routingTable.size,
            parentLogId,
        });
    }
    getTrackedCommonPrefixLengthsForRefresh(maxCommonPrefix) {
        if (maxCommonPrefix > MAX_COMMON_PREFIX_LENGTH) {
            maxCommonPrefix = MAX_COMMON_PREFIX_LENGTH;
        }
        const dates = [];
        for (let i = 0; i <= maxCommonPrefix; i++) {
            // defaults to the zero value if we haven't refreshed it yet.
            dates[i] = this.commonPrefixLengthRefreshedAt[i] ?? new Date();
        }
        return dates;
    }
    async generateRandomKadKey(targetCommonPrefixLength) {
        if (this.routingTable.kb === null) {
            throw new Error('Routing table not started');
        }
        const randomData = (0, node_crypto_1.randomBytes)(2);
        const randomUint16 = (randomData[1] << 8) + randomData[0];
        return await this.makeKadKey(this.routingTable.kb.localNodeId, randomUint16, targetCommonPrefixLength);
    }
    async makeKadKey(localKadId, randomPrefix, targetCommonPrefixLength) {
        if (targetCommonPrefixLength > MAX_COMMON_PREFIX_LENGTH) {
            throw new Error(`Cannot generate peer ID for common prefix length greater than ${MAX_COMMON_PREFIX_LENGTH}`);
        }
        const view = new DataView(localKadId.buffer, localKadId.byteOffset, localKadId.byteLength);
        const localPrefix = view.getUint16(0, false);
        // For host with ID `L`, an ID `K` belongs to a bucket with ID `B` ONLY IF CommonPrefixLen(L,K) is EXACTLY B.
        // Hence, to achieve a targetPrefix `T`, we must toggle the (T+1)th bit in L & then copy (T+1) bits from L
        // to our randomly generated prefix.
        const toggledLocalPrefix = localPrefix ^ (0x8000 >> targetCommonPrefixLength);
        // Combine the toggled local prefix and the random bits at the correct offset
        // such that ONLY the first `targetCommonPrefixLength` bits match the local ID.
        const mask = 65535 << (16 - (targetCommonPrefixLength + 1));
        const targetPrefix = (toggledLocalPrefix & mask) | (randomPrefix & ~mask);
        // Convert to a known peer ID.
        const keyPrefix = generatedPrefixList_1.default[targetPrefix];
        const keyBuffer = new ArrayBuffer(32);
        const keyView = new DataView(keyBuffer, 0, keyBuffer.byteLength);
        keyView.setUint32(0, keyPrefix, false);
        return Buffer.from(keyView.buffer);
    }
    /**
     * returns the maximum common prefix length between any peer in the table
     * and the current peer
     */
    maxCommonPrefix() {
        // xor our KadId with every KadId in the k-bucket tree,
        // return the longest id prefix that is the same
        let prefixLength = 0;
        for (const pl of this.prefixLengths()) {
            if (pl > prefixLength) {
                prefixLength = pl;
            }
        }
        return prefixLength;
    }
    /**
     * Returns the number of peers in the table with a given prefix length
     */
    numPeersForCpl(prefixLength) {
        let count = 0;
        for (const pl of this.prefixLengths()) {
            if (pl === prefixLength) {
                count++;
            }
        }
        return count;
    }
    /**
     * Yields the common prefix length of every peer in the table
     */
    *prefixLengths() {
        if (this.routingTable.kb === null) {
            return;
        }
        for (const { id } of this.routingTable.kb.toIterable()) {
            const distance = (0, bufferUtils_1.xor)(Buffer.from(this.routingTable.kb.localNodeId), id);
            let leadingZeros = 0;
            for (const byte of distance) {
                if (byte === 0) {
                    leadingZeros++;
                }
                else {
                    break;
                }
            }
            yield leadingZeros;
        }
    }
}
exports.RoutingTableRefresh = RoutingTableRefresh;
//# sourceMappingURL=RoutingTableRefresh.js.map