import type * as Bootstrap from '@libp2p/bootstrap';
import type { PeerId } from '@libp2p/interface-peer-id';
import type { Peer } from '@libp2p/interface-peer-store';
import type * as KadDHT from '@libp2p/kad-dht';
import { RoutingTable } from '@libp2p/kad-dht/dist/src/routing-table';
import type * as Websockets from '@libp2p/websockets';
import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import Log from '@ulixee/commons/lib/Logger';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import IPeerNetwork, {
  IPeerNetworkConfig,
  IPeerNetworkEvents,
} from '@ulixee/platform-specification/types/IPeerNetwork';
import * as Fs from 'fs';
import type * as Libp2pModule from 'libp2p';
import type * as TransportLevelSecurity from 'libp2p/insecure';
import { isIPv4 } from 'net';
import * as Path from 'path';
import SqliteDatastore from './SqliteDatastore';
import {
  base32,
  decodeCIDFromBase32,
  dynamicImport,
  encodeSha256AsCID,
  parseMultiaddrs,
  peerIdFromIdentity,
  peerIdFromNodeId,
} from './utils';

type Libp2p = Libp2pModule.Libp2p;
type Libp2pOptions = Libp2pModule.Libp2pOptions;

const { log } = Log(module);

export default class P2pConnection
  extends TypedEventEmitter<IPeerNetworkEvents>
  implements IPeerNetwork
{
  public nodeId: string;
  public multiaddrs: string[];

  public get connectedPeers(): number {
    return this.libp2p.getPeers().length;
  }

  public nodeInfo: INodeInfo;
  public libp2p: Libp2p;
  public peerId: PeerId;
  public datastore?: SqliteDatastore;

  private readonly nodeIdLastSeenDates: { [id: string]: Date } = {};
  private readonly nodeInfoById: { [id: string]: Promise<INodeInfo> } = {};
  private isClosing: Resolvable<void>;
  private dhtReadyPromise: Resolvable<void>;
  private closeAbortController = new AbortController();
  private pendingOperationAborts = new Set<AbortController>();
  private logger: IBoundLog;
  private identifyBytes: Buffer;

  constructor() {
    super();
    this.onDatastoreEntryDeleted = this.onDatastoreEntryDeleted.bind(this);
  }

  public createP2pMultiaddr(peerId: string, port: number, publicIpOrDomain = '0.0.0.0'): string {
    if (publicIpOrDomain === 'localhost') publicIpOrDomain = '127.0.0.1';
    const isIp = isIPv4(publicIpOrDomain);
    if (!isIp) {
      return `/dnsaddr/${publicIpOrDomain}/tcp/${port}/ws/p2p/${peerId}`;
    }
    return `/ip4/${publicIpOrDomain}/tcp/${port}/ws/p2p/${peerId}`;
  }

  public async start(options: IPeerNetworkConfig): Promise<this> {
    options.ipOrDomain ??= '0.0.0.0';
    const { identity, port, ipOrDomain, ulixeeApiHost, boostrapList, attachToServer } = options;

    this.peerId = await peerIdFromIdentity(identity);
    this.nodeId = P2pConnection.createNodeId(this.peerId);
    this.logger = log.createChild(module, {
      nodeId: this.nodeId,
    });
    this.nodeInfo = {
      nodeId: this.nodeId,
      identity: identity.bech32,
      multiaddrs: [],
      ulixeeApiHost,
    };
    this.identifyBytes = Buffer.from(`${this.nodeInfo.ulixeeApiHost}/${this.nodeInfo.identity}`);

    if (!options.dbPath) {
      options.dbPath = ':memory:';
    } else if (!options.dbPath.endsWith('.db')) {
      options.dbPath = Path.join(options.dbPath, `${this.nodeId}.db`);
      await Fs.promises.mkdir(Path.dirname(options.dbPath), { recursive: true }).catch(() => null);
    }
    this.datastore = new SqliteDatastore(options.dbPath);
    this.datastore.on('delete', this.onDatastoreEntryDeleted);

    const { createLibp2p } = await dynamicImport<typeof Libp2pModule>('libp2p');
    const { bootstrap } = await dynamicImport<typeof Bootstrap>('@libp2p/bootstrap');
    const { kadDHT } = await dynamicImport<typeof KadDHT>('@libp2p/kad-dht');
    const { yamux } = await dynamicImport<typeof import('@chainsafe/libp2p-yamux')>(
      '@chainsafe/libp2p-yamux',
    );
    const { webSockets } = await dynamicImport<typeof Websockets>('@libp2p/websockets');
    const { plaintext } = await dynamicImport<typeof TransportLevelSecurity>('libp2p/insecure');
    const filters = await dynamicImport<typeof import('@libp2p/websockets/filters')>(
      '@libp2p/websockets/filters',
    );

    const address = this.createP2pMultiaddr(this.nodeId, port, ipOrDomain);
    const config: Libp2pOptions = {
      start: false,
      peerId: this.peerId,
      addresses: {
        listen: [address],
      },
      ping: {
        protocolPrefix: 'ulx',
      },
      transports: [
        webSockets({
          filter: filters.all,
          server: attachToServer,
        }),
      ],
      // use websocket transport security
      connectionEncryption: [plaintext()],
      streamMuxers: [yamux()],
      peerDiscovery: [],
      dht: kadDHT({
        clientMode: false,
        providers: {
          cleanupInterval: 60 * 60,
        },
        protocolPrefix: '/ulx',
        kBucketSize: 25,
      }),
      identify: {
        protocolPrefix: 'ulx', // doesn't want leading slash
      },
      datastore: this.datastore,
    };
    if (boostrapList?.length) {
      config.peerDiscovery.push(
        bootstrap({
          list: boostrapList,
          timeout: 0,
        }),
      );
    }
    this.libp2p = await createLibp2p(config);
    this.libp2p.addEventListener('peer:connect', event => {
      const connection = event.detail;
      const peerId = connection.remotePeer;
      const nodeId = peerId.toString();
      this.nodeIdLastSeenDates[nodeId] = new Date();
      this.logger.stats('P2pPeer.connect', {
        nodeId,
      });
      this.sawNode(nodeId);
    });

    this.libp2p.addEventListener('peer:discovery', async event => {
      try {
        const peers = this.libp2p.getPeers();
        if (peers.length >= 5) return; // let autodial handle connecting

        const peerInfo = event.detail;
        if (peerInfo.id.equals(this.peerId)) return;
        let addresses = peerInfo.multiaddrs;
        if (('addresses' in peerInfo) as unknown as Peer) {
          addresses = (peerInfo as unknown as Peer).addresses.map(x => x.multiaddr);
        }
        if (addresses.length) {
          await this.libp2p.dial(addresses, { signal: this.closeAbortController.signal });
        }
      } catch (error) {
        if (!this.closeAbortController.signal.aborted) {
          // don't log encryption failing before connect
          if (
            error.code === 'ERR_ENCRYPTION_FAILED' &&
            error.message.includes('stream ended before 1 bytes became available')
          )
            return;

          this.logger.error('Could not connect to discovered peer', { error, event });
        }
      }
    });
    await this.handleNodeInfoRequests();

    this.dhtReadyPromise = new Resolvable(
      30e3,
      `Network startup timed-out connecting to Peer network`,
    );

    await this.libp2p.start();

    this.multiaddrs = this.libp2p.getMultiaddrs().map(x => {
      let multiaddr = x.toString();
      if (!multiaddr.includes('/p2p/')) multiaddr += `/p2p/${this.nodeId}`;
      return multiaddr;
    });
    this.nodeInfo.multiaddrs = this.multiaddrs;

    const kBucketTree = (this.libp2p.dht.lan.routingTable as RoutingTable).kb;
    kBucketTree.on('updated' as any, selection => {
      const nodeId = selection.peer?.toString();
      this.nodeIdLastSeenDates[nodeId] = new Date();
      this.sawNode(nodeId);
    });
    kBucketTree.on('added', record => {
      const nodeId = record.peer?.toString();
      this.nodeIdLastSeenDates[nodeId] = new Date();
      this.sawNode(nodeId);
      this.dhtReadyPromise.resolve();
    });

    if (boostrapList?.length) {
      await this.ensureNetworkConnect();
    }

    this.logger.info('P2p.Started', {
      nodeInfo: this.nodeInfo,
      addrs: this.multiaddrs.map(x => x.toString()),
    });

    return this;
  }

  public ensureNetworkConnect(): Promise<void> {
    return this.dhtReadyPromise.promise;
  }

  public async close(): Promise<void> {
    if (this.isClosing) return this.isClosing.promise;

    this.isClosing = new Resolvable();

    try {
      try {
        this.closeAbortController.abort();
      } catch {}

      for (const abort of this.pendingOperationAborts) abort.abort();
      this.pendingOperationAborts.clear();

      await this.libp2p?.stop();
      // ensure we stop this no matter what. can get stuck open if libp2p startup has errors
      await (this.libp2p?.dht as any).stop();
      await this.datastore.close();
      this.isClosing.resolve();
    } catch (error) {
      this.isClosing.reject(error);
    }
    this.logger.info('P2p.stopped');
  }

  public async addPeer(peer: { nodeId?: string; multiaddrs: string[] }): Promise<void> {
    const multiaddrs = await parseMultiaddrs(peer.multiaddrs);
    const nodeId = peer.nodeId ?? multiaddrs.find(x => !!x.getPeerId())?.getPeerId();
    if (!nodeId) throw new Error('Cannot connect to a peer without any nodeId.');

    if (this.nodeId === nodeId) return;

    const peerId = await peerIdFromNodeId(nodeId);

    // we're good, don't need to add more peers
    if (this.libp2p.getPeers().length > 50 || (await this.libp2p.peerStore.has(peerId))) {
      return;
    }

    await this.libp2p.peerStore.addressBook.add(peerId, multiaddrs);
    await this.libp2p.dial(peerId, { signal: this.closeAbortController.signal });
    await this.libp2p.dht.refreshRoutingTable().catch(() => null);
  }

  public async getKnownNodes(maxNodes = 25): Promise<(INodeInfo & { lastSeenDate: Date })[]> {
    const peers = (await this.libp2p.peerStore.all()).slice(0, maxNodes).map(x => x.id);
    const nodeInfos = await Promise.all(peers.map(x => this.lookupNodeInfo(x).catch(() => null)));
    const results: (INodeInfo & { lastSeenDate: Date })[] = [];
    for (const node of nodeInfos) {
      if (!node) continue;
      results.push({ ...node, lastSeenDate: this.nodeIdLastSeenDates[node.nodeId] });
    }
    return results;
  }

  /**
   * Uses XOR distance to find closest peers. Auto-converts to sha256 of key
   */
  public async findClosestNodes(hash: Buffer): Promise<INodeInfo[]> {
    const query = this.libp2p.peerRouting.getClosestPeers(hash, {
      signal: this.closeAbortController.signal,
    });

    const nodeInfos: Promise<INodeInfo>[] = [];
    for await (const peer of query) {
      nodeInfos.push(this.lookupNodeInfo(peer.id).catch(() => null));
    }
    return Promise.all(nodeInfos);
  }

  /**
   * Search the dht for up to `K` providers of the given CID.
   */
  public async *findProviderNodes(
    hash: Buffer,
    { timeout = 5000, abort = null as AbortSignal } = {},
  ): AsyncGenerator<INodeInfo> {
    await this.ensureNetworkConnect();

    const abortController = new AbortController();
    this.pendingOperationAborts.add(abortController);
    const doAbort = abortController.abort.bind(abortController);
    try {
      if (abort) abort.addEventListener('abort', doAbort);
      if (timeout) {
        const timer = setTimeout(doAbort, timeout).unref();
        abortController.signal.onabort = () => clearTimeout(timer);
      }

      const cid = await encodeSha256AsCID(hash);
      const query = this.libp2p.contentRouting.findProviders(cid, {
        signal: abortController.signal,
      });

      for await (const entry of query) {
        yield await this.lookupNodeInfo(entry.id);
      }
    } catch (error) {
      if (error.code === 'ERR_NOT_FOUND') {
        return;
      }
      throw error;
    } finally {
      this.pendingOperationAborts.delete(abortController);
    }
  }

  // TODO: complete implementation
  public async broadcast(_content: any): Promise<boolean> {
    // track "parent" nodes.
    // tree is initialized with a parent nodes
    const id = BigInt(Buffer.from((await peerIdFromNodeId(this.nodeId)).toBytes()).toString('hex'));
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
    const _parent = await this.libp2p.peerRouting.getClosestPeers(parentBytes);
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
   * Announce to the network that we can provide given key's value.
   */
  public async provide(sha256Hash: Buffer): Promise<{ providerKey: string }> {
    await this.ensureNetworkConnect();
    this.logger.info('ProvidingKeyToNetwork', { sha256Hash });
    const cid = await encodeSha256AsCID(sha256Hash);
    await this.libp2p.contentRouting.provide(cid);
    const base32Encoded = await base32(cid.multihash.bytes);
    // have to hardcode.. can't get out of libp2p
    const providerKey = `/dht/provider/${base32Encoded}`;
    return { providerKey };
  }

  // PRIVATE METHODS ///////////////////////////////////////////////////////////////////////////////

  private async onDatastoreEntryDeleted(event: { key: string }): Promise<Buffer> {
    if (!event.key.startsWith('/dht')) return;
    const [cidBase32, nodeId] = event.key.replace('/dht/provider/', '').split('/');
    if (nodeId !== this.nodeId) {
      return;
    }
    const cid = await decodeCIDFromBase32(cidBase32);
    const bytes = Buffer.from(cid.multihash.digest);
    this.emit('provide-expired', { hash: bytes });
    return bytes;
  }

  private async lookupNodeInfo(peerId: PeerId): Promise<INodeInfo> {
    const nodeId = peerId.toString();
    if (nodeId === this.nodeId) return this.nodeInfo;

    this.nodeInfoById[nodeId] ??= this.dialNodeLookup(nodeId, peerId);
    return this.nodeInfoById[nodeId];
  }

  private sawNode(nodeId: string): void {
    if (this.nodeInfoById[nodeId]) {
      void this.nodeInfoById[nodeId].then(info =>
        this.emit('node-seen', {
          node: { ...info, lastSeenDate: this.nodeIdLastSeenDates[nodeId] },
        }),
      );
    }
  }

  private async dialNodeLookup(nodeId: string, peerId: PeerId, attempt = 0): Promise<INodeInfo> {
    if (nodeId === this.nodeId) return this.nodeInfo;

    const stream = await this.libp2p.dialProtocol(peerId, '/ulx/apiInfo/v1', {
      signal: this.closeAbortController.signal,
    });
    const { pipe, lp, first } = await getIterators();

    const address = await this.libp2p.peerStore.get(peerId);
    const nodePath = `/p2p/${nodeId}`;
    const multiaddrs = address.addresses.map(x => {
      const addr = x.multiaddr.toString();
      if (!addr.includes('/p2p/')) return addr + nodePath;
      return addr;
    });

    try {
      const node = await pipe(
        [this.identifyBytes],
        source => lp.encode(source),
        stream,
        source => lp.decode(source),
        async source => {
          try {
            const response = await first(source);
            const result = Buffer.from(response.subarray());
            const [ulixeeApiHost, identity] = result.toString().split('/');
            return {
              nodeId,
              multiaddrs,
              identity,
              ulixeeApiHost,
            };
          } catch (error) {
            if (!this.closeAbortController.signal.aborted) {
              await new Promise(resolve => setTimeout(resolve, 2 ** attempt * 100).unref());
              if (attempt < 5) {
                return this.dialNodeLookup(nodeId, peerId, attempt++);
              }
            }
            return undefined;
          }
        },
      );
      if (node) {
        this.nodeIdLastSeenDates[nodeId] ??= new Date();
        this.emit('node-seen', {
          node: { ...node, lastSeenDate: this.nodeIdLastSeenDates[nodeId] },
        });
      }
      return node;
    } catch (error) {
      if (this.closeAbortController.signal.aborted) return;
      throw error;
    }
  }

  private async handleNodeInfoRequests(): Promise<void> {
    const nodeInfo = this.identifyBytes;
    const { pipe, lp, first } = await getIterators();
    const hostNodeInfo = this.nodeInfoById;
    await this.libp2p.handle('/ulx/apiInfo/v1', ({ stream, connection }) => {
      pipe(
        stream,
        source => lp.decode(source),
        async function* sink(source) {
          try {
            const entry = await first(source);
            const result = Buffer.from(entry.subarray());
            const [ulixeeApiHost, identity] = result.toString().split('/');
            let multiaddr = connection.remoteAddr.toString();
            const nodeId = connection.remotePeer.toString();
            if (!multiaddr.includes('/p2p/')) multiaddr += `/p2p/${nodeId}`;

            hostNodeInfo[nodeId] = Promise.resolve({
              nodeId,
              multiaddrs: [multiaddr],
              ulixeeApiHost,
              identity,
            });

            yield nodeInfo;
          } catch (error) {}
        },
        source => lp.encode(source),
        stream,
      ).catch(error => {
        if (this.closeAbortController.signal.aborted) return;
        this.logger.error('ERROR returning nodeInfo', error);
      });
    });
  }

  public static createNodeId(peerId: PeerId): string {
    return peerId.toString();
  }
}

async function getIterators(): Promise<{
  pipe: typeof import('it-pipe').pipe;
  lp: typeof import('it-length-prefixed');
  first: typeof import('it-first').default;
}> {
  const { pipe } = await dynamicImport<typeof import('it-pipe')>('it-pipe');
  const lp = await dynamicImport<typeof import('it-length-prefixed')>('it-length-prefixed');
  const itFirst = await dynamicImport<typeof import('it-first')>('it-first');
  return { pipe, lp, first: itFirst.default };
}
