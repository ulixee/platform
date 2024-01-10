"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nodeIdToKadId = exports.Kad = void 0;
const asyncUtils_1 = require("@ulixee/commons/lib/asyncUtils");
const bufferUtils_1 = require("@ulixee/commons/lib/bufferUtils");
const eventUtils_1 = require("@ulixee/commons/lib/eventUtils");
const hashUtils_1 = require("@ulixee/commons/lib/hashUtils");
const Logger_1 = require("@ulixee/commons/lib/Logger");
const Resolvable_1 = require("@ulixee/commons/lib/Resolvable");
const Identity_1 = require("@ulixee/crypto/lib/Identity");
const KadDb_1 = require("../db/KadDb");
const ContentFetching_1 = require("./ContentFetching");
const ContentRouting_1 = require("./ContentRouting");
const Network_1 = require("./Network");
const PeerRouting_1 = require("./PeerRouting");
const PeerStore_1 = require("./PeerStore");
const Providers_1 = require("./Providers");
const QueryManager_1 = require("./QueryManager");
const QuerySelf_1 = require("./QuerySelf");
const RoutingTable_1 = require("./RoutingTable");
const RoutingTableRefresh_1 = require("./RoutingTableRefresh");
const { log: Log } = (0, Logger_1.default)(module);
/**
 * A DHT implementation modelled after Kademlia with S/Kademlia modifications.
 * Original implementation in go: https://github.com/libp2p/go-libp2p-kad-dht.
 */
class Kad extends eventUtils_1.TypedEventEmitter {
    constructor(init) {
        super();
        this.init = init;
        this.connectedToNodesPromise = new Resolvable_1.default();
        this.closeAbortController = new AbortController();
        const { kBucketSize, querySelfInterval, pingTimeout, pingConcurrency, providers: providersInit, dbPath, identity, ipOrDomain, apiHost, port, } = init;
        this.onProvideExpired = this.onProvideExpired.bind(this);
        this.running = false;
        this.nodeInfo = {
            nodeId: identity.bech32,
            kadId: (0, hashUtils_1.sha256)(identity.bech32),
            apiHost,
            kadHost: `${ipOrDomain ?? 'localhost'}:${port}`,
        };
        this.logger = Log.createChild(module, {
            nodeId: this.nodeInfo.nodeId,
        });
        this.kBucketSize = kBucketSize ?? 20;
        this.routingTable = new RoutingTable_1.RoutingTable(this, {
            kBucketSize,
            pingTimeout,
            pingConcurrency,
        });
        this.identity = init.identity;
        this.db = new KadDb_1.default(dbPath);
        this.peerStore = new PeerStore_1.PeerStore(this.db);
        this.peerStore.on('new', this.onPeer.bind(this));
        this.peerStore.add(this.nodeInfo, true);
        this.providers = new Providers_1.Providers(this, providersInit ?? {});
        this.providers.onExpire(this.onProvideExpired);
        this.network = new Network_1.Network(this);
        // all queries should wait for the initial query-self query to run so we have
        // some peers and don't force consumers to use arbitrary timeouts
        const initialQuerySelfHasRun = new Resolvable_1.default();
        // if the user doesn't want to wait for query peers, resolve the initial
        // self-query promise immediately
        if (init.allowQueryWithZeroPeers === true) {
            initialQuerySelfHasRun.resolve();
        }
        this.queryManager = new QueryManager_1.QueryManager(this, {
            // Number of disjoint query paths to use - This is set to `kBucketSize/2` per the S/Kademlia paper
            disjointPaths: Math.ceil(this.kBucketSize / 2),
            initialQuerySelfHasRun,
            routingTable: this.routingTable,
        });
        // DHT components
        this.peerRouting = new PeerRouting_1.PeerRouting(this);
        this.contentRouting = new ContentRouting_1.ContentRouting(this);
        this.contentFetching = new ContentFetching_1.ContentFetching(this);
        this.routingTableRefresh = new RoutingTableRefresh_1.RoutingTableRefresh(this);
        this.querySelf = new QuerySelf_1.QuerySelf(this, {
            interval: querySelfInterval,
            initialInterval: init.initialQuerySelfInterval,
            initialQuerySelfHasRun,
        });
    }
    get nodeHost() {
        return `${this.nodeInfo.kadHost}/${this.nodeInfo.nodeId}`;
    }
    get nodeId() {
        return this.nodeInfo.nodeId;
    }
    get connectedPeers() {
        return this.network.connections;
    }
    async addConnection(transport) {
        return await this.network.addConnectionToClient(transport);
    }
    ensureNetworkConnected() {
        return this.connectedToNodesPromise.promise;
    }
    /**
     * Is this DHT running.
     */
    isStarted() {
        return this.running;
    }
    /**
     * Start listening to incoming connections.
     */
    async start() {
        this.running = true;
        const parentLogId = this.logger.info('Kad.Starting', {
            nodeInfo: this.nodeInfo,
            boostrapList: this.init.boostrapList,
        });
        await Promise.all([
            this.providers.start(),
            this.queryManager.start(),
            this.network.start(),
            this.routingTable.start(),
            this.querySelf.start(),
        ]);
        if (this.init.boostrapList) {
            for (const bootstrap of this.init.boostrapList) {
                const [host, id] = bootstrap.split('/');
                if (id)
                    await this.network.dial(host, id);
                else
                    await this.network.blindDial(host);
            }
        }
        await this.routingTableRefresh.start();
        if (this.init.boostrapList?.length) {
            await this.connectedToNodesPromise;
        }
        this.logger.stats('Kad.Started', {
            parentLogId,
        });
        return this;
    }
    /**
     * Stop accepting incoming connections and sending outgoing
     * messages.
     */
    async close() {
        this.running = false;
        try {
            this.closeAbortController.abort();
        }
        catch { }
        await Promise.all([
            this.providers.stop(),
            this.queryManager.stop(),
            this.network.stop(),
            this.routingTable.stop(),
            this.routingTableRefresh.stop(),
            this.querySelf.stop(),
        ]);
        this.db.close();
    }
    getKnownNodes(maxNodes = 25) {
        return this.peerStore
            .all(true)
            .filter(x => x.nodeId !== this.nodeId)
            .slice(0, maxNodes);
    }
    /**
     * Uses XOR distance to find closest peers. Auto-converts to sha256 of key
     */
    async findClosestNodes(hash) {
        const query = this.peerRouting.getClosestPeers(hash, {
            signal: this.closeAbortController.signal,
        });
        const nodeInfos = [];
        for await (const peer of query) {
            nodeInfos.push(peer);
        }
        return nodeInfos;
    }
    // TODO: complete implementation
    async broadcast(_content) {
        // tree is initialized with a parent node (would be coded?)
        const rootNode = Identity_1.default.createSync().bech32;
        const thisKadId = (0, bufferUtils_1.bufferToBigInt)(this.nodeInfo.kadId);
        const rootKadId = (0, bufferUtils_1.bufferToBigInt)(nodeIdToKadId(rootNode));
        const m = 2n ** 256n; // 2 ^ bits
        const rootDistance = (rootKadId - thisKadId) % m;
        const bucketSize = rootDistance / BigInt(this.init.kBucketSize);
        let parentKadIdBig;
        // on left of tree
        if (rootDistance > 0 && rootDistance <= m / 2n) {
            parentKadIdBig = (rootKadId + bucketSize) % m;
        }
        else {
            parentKadIdBig = (rootKadId - (m - bucketSize)) % m;
        }
        const parentKadId = Buffer.from(parentKadIdBig.toString(16), 'hex');
        const _parent = await this.peerRouting.getClosestPeers(parentKadId);
        // TODO: need to track as closer peers comes in and out. Registration process:
        // 1. send to parent that we are child
        // 2. parent keeps list of children
        // 2b. If > k children, tell child that fits least that it needs to reparent (each node sees if node is in it's "range")
        // 3. child keeps pinging parent to tell it status every 1 min (parent should delete if not called after 10 minutes)
        // 3b. If parent fails to reply, must find a new parent.
        // https://groups.csail.mit.edu/ana/Publications/PubPDFs/Implementing-Aggregation-and-Broadcast-over-distributed-hash-tables.pdf
        return Promise.resolve(false);
    }
    /**
     * Uses XOR distance to find closest peers. Auto-converts to sha256 of key
     */
    async findPeer(nodeId) {
        const query = this.peerRouting.findPeer(nodeId, {
            signal: this.closeAbortController.signal,
        });
        for await (const peer of query) {
            if (peer.nodeInfo.nodeId === nodeId)
                return peer.nodeInfo;
        }
    }
    /**
     * Search the dht for up to `K` providers of the given CID.
     */
    async *findProviderNodes(key, { timeout = 5000, signal = null } = {}) {
        await this.connectedToNodesPromise;
        const query = this.contentRouting.findProviders(key, {
            signal,
            queryTimeout: timeout,
        });
        for await (const entry of query) {
            for (const provider of entry.providers) {
                if (provider.nodeId === this.nodeInfo.nodeId)
                    continue;
                yield provider;
            }
        }
    }
    async *get(key, { timeout = 5000, signal = null } = {}) {
        await this.connectedToNodesPromise;
        let lastPublished;
        for await (const result of this.contentFetching.get(key, { signal, queryTimeout: timeout })) {
            if (lastPublished?.timestamp >= result.record.timestamp)
                continue;
            lastPublished = result.record;
            yield result.record;
        }
    }
    async *put(key, record, { minPutPeers = 1, timeout = 5000, signal = null } = {}) {
        await this.connectedToNodesPromise;
        let counter = 0;
        for await (const put of this.contentFetching.put(key, record, {
            signal,
            queryTimeout: timeout,
        })) {
            counter += 1;
            yield { putToPeer: put.notifiedPeer };
        }
        if (counter < minPutPeers)
            throw new Error('Could not find enough peers to put to');
    }
    /**
     * Announce to the network that we can provide given key's value.
     */
    async provide(key) {
        await this.connectedToNodesPromise;
        await (0, asyncUtils_1.first)(this.contentRouting.provide(key));
    }
    async addPeer(node) {
        const nodeId = node.nodeId;
        if (!nodeId)
            throw new Error('Cannot connect to a node without any nodeId.');
        if (this.nodeInfo.nodeId === nodeId)
            return;
        await this.network.dial(node.kadHost, node.nodeId, {
            signal: this.closeAbortController.signal,
        });
    }
    async refreshRoutingTable() {
        this.routingTableRefresh.refreshTable(true);
    }
    async onProvideExpired(event) {
        if (event.providerNodeId !== this.nodeInfo.nodeId) {
            return;
        }
        this.emit('provide-expired', { key: event.key, providerNodeId: event.providerNodeId });
        return event.key;
    }
    onPeer(nodeInfo) {
        this.connectedToNodesPromise.resolve();
        this.emit('peer-connected', { node: nodeInfo });
    }
}
exports.Kad = Kad;
function nodeIdToKadId(id) {
    return (0, hashUtils_1.sha256)((0, bufferUtils_1.decodeBuffer)(id, Identity_1.default.encodingPrefix));
}
exports.nodeIdToKadId = nodeIdToKadId;
//# sourceMappingURL=Kad.js.map