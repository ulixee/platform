import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import { first } from '@ulixee/commons/lib/asyncUtils';
import { bufferToBigInt } from '@ulixee/commons/lib/bufferUtils';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import Logger from '@ulixee/commons/lib/Logger';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import Identity from '@ulixee/crypto/lib/Identity';
import type ITransport from '@ulixee/net/interfaces/ITransport';
import IKad, { IKadConfig, IKadEvents } from '@ulixee/platform-specification/types/IKad';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import KadDb from '../db/KadDb';
import NodeId from '../interfaces/NodeId';
import IKadOptions from '../interfaces/IKadOptions';
import ConnectionToKadClient from './ConnectionToKadClient';
import { ContentRouting } from './ContentRouting';
import { Network } from './Network';
import { PeerRouting } from './PeerRouting';
import { PeerStore } from './PeerStore';
import { Providers } from './Providers';
import { QueryManager } from './QueryManager';
import { QuerySelf } from './QuerySelf';
import { RoutingTable } from './RoutingTable';
import { RoutingTableRefresh } from './RoutingTableRefresh';

const { log: Log } = Logger(module);

/**
 * A DHT implementation modelled after Kademlia with S/Kademlia modifications.
 * Original implementation in go: https://github.com/libp2p/go-libp2p-kad-dht.
 */
export class Kad extends TypedEventEmitter<IKadEvents> implements IKad {
  public routingTable: RoutingTable;
  public providers: Providers;
  public network: Network;
  public peerRouting: PeerRouting;
  public db: KadDb;
  public nodeInfo: INodeInfo;
  public peerStore: PeerStore;
  public identity: Identity;
  public readonly contentRouting: ContentRouting;
  public readonly queryManager: QueryManager;
  public readonly querySelf: QuerySelf;

  public get nodeHost(): string {
    return `${this.nodeInfo.kadHost}/${this.nodeInfo.nodeId}`;
  }

  public get nodeId(): string {
    return this.nodeInfo.nodeId;
  }

  public get connectedPeers(): number {
    return this.network.connections;
  }

  private connectedToNodesPromise = new Resolvable<void>();
  private logger: IBoundLog;
  private running: boolean;
  private readonly kBucketSize: number;
  private closeAbortController = new AbortController();
  private readonly routingTableRefresh: RoutingTableRefresh;

  constructor(private init: IKadOptions & IKadConfig) {
    super();
    const {
      kBucketSize,
      querySelfInterval,
      pingTimeout,
      pingConcurrency,
      providers: providersInit,
      dbPath,
      identity,
      ipOrDomain,
      apiHost,
      port,
    } = init;
    this.onProvideExpired = this.onProvideExpired.bind(this);

    this.running = false;
    this.nodeInfo = {
      nodeId: identity.bech32,
      apiHost,
      kadHost: `${ipOrDomain ?? 'localhost'}:${port}`,
    };
    this.logger = Log.createChild(module, {
      nodeId: this.nodeInfo.nodeId,
    });
    this.kBucketSize = kBucketSize ?? 20;
    this.routingTable = new RoutingTable(this, {
      kBucketSize,
      pingTimeout,
      pingConcurrency,
    });
    this.identity = init.identity;

    this.db = new KadDb(dbPath);
    this.peerStore = new PeerStore(this.db);
    this.peerStore.on('new', this.onPeer.bind(this));
    this.peerStore.add(this.nodeInfo, true);
    this.providers = new Providers(this, providersInit ?? {});
    this.providers.onExpire(this.onProvideExpired);

    this.network = new Network(this);

    // all queries should wait for the initial query-self query to run so we have
    // some peers and don't force consumers to use arbitrary timeouts
    const initialQuerySelfHasRun = new Resolvable<void>();

    // if the user doesn't want to wait for query peers, resolve the initial
    // self-query promise immediately
    if (init.allowQueryWithZeroPeers === true) {
      initialQuerySelfHasRun.resolve();
    }

    this.queryManager = new QueryManager(this, {
      // Number of disjoint query paths to use - This is set to `kBucketSize/2` per the S/Kademlia paper
      disjointPaths: Math.ceil(this.kBucketSize / 2),
      initialQuerySelfHasRun,
      routingTable: this.routingTable,
    });

    // DHT components
    this.peerRouting = new PeerRouting(this);
    this.contentRouting = new ContentRouting(this);
    this.routingTableRefresh = new RoutingTableRefresh(this);
    this.querySelf = new QuerySelf(this, {
      interval: querySelfInterval,
      initialInterval: init.initialQuerySelfInterval,
      initialQuerySelfHasRun,
    });
  }

  public async addConnection(transport: ITransport): Promise<ConnectionToKadClient> {
    return await this.network.addConnectionToClient(transport);
  }

  ensureNetworkConnected(): Promise<void> {
    return this.connectedToNodesPromise.promise;
  }

  /**
   * Is this DHT running.
   */
  isStarted(): boolean {
    return this.running;
  }

  /**
   * Start listening to incoming connections.
   */
  async start(): Promise<this> {
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
        if (id) await this.network.dial(host, id);
        else await this.network.blindDial(host);
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
  async close(): Promise<void> {
    this.running = false;
    try {
      this.closeAbortController.abort();
    } catch {}

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

  public getKnownNodes(maxNodes = 25): (INodeInfo & { lastSeenDate: Date })[] {
    return this.peerStore
      .all(true)
      .filter(x => x.nodeId !== this.nodeId)
      .slice(0, maxNodes);
  }

  /**
   * Uses XOR distance to find closest peers. Auto-converts to sha256 of key
   */
  public async findClosestNodes(hash: Buffer): Promise<INodeInfo[]> {
    const query = this.peerRouting.getClosestPeers(hash, {
      signal: this.closeAbortController.signal,
    });

    const nodeInfos: INodeInfo[] = [];
    for await (const peer of query) {
      nodeInfos.push(peer);
    }
    return nodeInfos;
  }

  // TODO: complete implementation
  public async broadcast(_content: any): Promise<boolean> {
    // track "parent" nodes.
    // tree is initialized with a parent nodes
    const id = bufferToBigInt(Identity.getBytes(this.nodeId));
    const root = BigInt(Buffer.from('pre-shared-or-from-peer').toString('hex'));
    const m = 2n ** 256n; // 2 ^ bits
    const k = 20n; // k bucket size?
    const rootDistance = (root - id) % m;
    let parentId: BigInt;
    if (rootDistance > 0 && rootDistance <= m / 2n) {
      parentId = (root + rootDistance / k) % m;
    } else {
      parentId = (root - (m - rootDistance / k)) % m;
    }
    const parentBytes = Buffer.from(parentId.toString(16), 'hex');
    const _parent = await this.peerRouting.getClosestPeers(parentBytes);
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
  public async findPeer(nodeId: NodeId): Promise<INodeInfo> {
    const query = this.peerRouting.findPeer(nodeId, {
      signal: this.closeAbortController.signal,
    });

    for await (const peer of query) {
      if (peer.nodeInfo.nodeId === nodeId) return peer.nodeInfo;
    }
  }

  /**
   * Search the dht for up to `K` providers of the given CID.
   */
  public async *findProviderNodes(
    key: Buffer,
    { timeout = 5000, signal = null as AbortSignal } = {},
  ): AsyncGenerator<INodeInfo> {
    await this.connectedToNodesPromise;
    const query = this.contentRouting.findProviders(key, {
      signal,
      queryTimeout: timeout,
    });

    for await (const entry of query) {
      for (const provider of entry.providers) {
        if (provider.nodeId === this.nodeInfo.nodeId) continue;
        yield provider;
      }
    }
  }

  /**
   * Announce to the network that we can provide given key's value.
   */
  public async provide(key: Buffer): Promise<void> {
    await this.connectedToNodesPromise;
    await first(this.contentRouting.provide(key));
  }

  public async addPeer(node: INodeInfo): Promise<void> {
    const nodeId = node.nodeId;
    if (!nodeId) throw new Error('Cannot connect to a node without any nodeId.');

    if (this.nodeInfo.nodeId === nodeId) return;

    await this.network.dial(node.kadHost, node.nodeId, {
      signal: this.closeAbortController.signal,
    });
  }

  async refreshRoutingTable(): Promise<void> {
    this.routingTableRefresh.refreshTable(true);
  }

  private async onProvideExpired(event: { key: Buffer; providerNodeId: string }): Promise<Buffer> {
    if (event.providerNodeId !== this.nodeInfo.nodeId) {
      return;
    }
    this.emit('provide-expired', { key: event.key, providerNodeId: event.providerNodeId });
    return event.key;
  }

  private onPeer(nodeInfo: INodeInfo): void {
    this.connectedToNodesPromise.resolve();
    this.emit('peer-connected', { node: nodeInfo });
  }
}
