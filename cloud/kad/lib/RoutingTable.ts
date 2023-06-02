import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import { debounce } from '@ulixee/commons/lib/asyncUtils';
import Logger from '@ulixee/commons/lib/Logger';
import Queue from '@ulixee/commons/lib/Queue';
import Signals from '@ulixee/commons/lib/Signals';
import KBucket = require('k-bucket');
import NodeId from '../interfaces/NodeId';
import { nodeIdToKadId } from '../test/_helpers';
import type { Kad } from './Kad';

export const KAD_CLOSE_TAG_NAME = 'kad-close';
export const KAD_CLOSE_TAG_VALUE = 50;
export const KBUCKET_SIZE = 20;
export const PING_TIMEOUT = 10000;
export const PING_CONCURRENCY = 10;

export interface KBucketPeer {
  id: Buffer;
  nodeId: NodeId;
  vectorClock: number;
}

type KBucketTree = KBucket<KBucketPeer> & {
  toIterable: () => Iterable<KBucketPeer>;
};

export interface RoutingTableInit {
  kBucketSize?: number;
  pingTimeout?: number;
  pingConcurrency?: number;
  tagName?: string;
  tagValue?: number;
}

/**
 * A wrapper around `k-bucket`, to provide easy store and
 * retrieval for peers.
 */
export class RoutingTable {
  public kBucketSize: number;
  public kb?: KBucketTree = null;
  public pingQueue: Queue;

  private readonly logger: IBoundLog;
  private readonly pingTimeout: number;
  private readonly pingConcurrency: number;
  private running: boolean;
  private readonly tagName: string;
  private readonly tagValue: number;
  private closestNodeIds = new Set<NodeId>();

  constructor(
    private readonly kad: Pick<Kad, 'nodeInfo' | 'peerStore' | 'network'>,
    init: RoutingTableInit,
  ) {
    const { kBucketSize, pingTimeout, pingConcurrency, tagName, tagValue } = init;

    this.logger = Logger(module).log;
    this.kBucketSize = kBucketSize ?? KBUCKET_SIZE;
    this.pingTimeout = pingTimeout ?? PING_TIMEOUT;
    this.pingConcurrency = pingConcurrency ?? PING_CONCURRENCY;
    this.running = false;
    this.tagName = tagName ?? KAD_CLOSE_TAG_NAME;
    this.tagValue = tagValue ?? KAD_CLOSE_TAG_VALUE;

    this.pingQueue = new Queue('KAD PING', this.pingConcurrency);

    this.onPing = this.onPing.bind(this);
    this.updatePeerTags = debounce(this.updatePeerTags.bind(this), 0);
  }

  isStarted(): boolean {
    return this.running;
  }

  async start(): Promise<void> {
    this.running = true;

    this.kb = new KBucket({
      localNodeId: this.kad.nodeInfo.kadId,
      numberOfNodesPerKBucket: this.kBucketSize,
      numberOfNodesToPing: 1,
    }) as KBucketTree;

    // test whether to evict peers
    this.kb.on('ping', this.onPing);
    this.kb.on('added', this.updatePeerTags);
    this.kb.on('removed', this.updatePeerTags);
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    this.kb.off('ping', this.onPing);
    this.kb.off('added', this.updatePeerTags);
    this.kb.off('removed', this.updatePeerTags);
    this.pingQueue.stop();
    this.kb = null;
  }

  // -- Public Interface

  /**
   * Amount of currently stored peers
   */
  get size(): number {
    if (!this.kb) return 0;

    return this.kb.count();
  }

  /**
   * Retrieve the `count`-closest peers to the given key
   */
  closestPeers(key: Buffer, count = this.kBucketSize): NodeId[] {
    if (!this.kb) return [];

    return this.kb.closest(key, count).map(x => x.nodeId);
  }

  /**
   * Add or update the routing table with the given peer
   */
  add(nodeId: NodeId): void {
    if (!this.kb) {
      throw new Error('RoutingTable is not started');
    }

    // don't add self
    if (nodeId === this.kad.nodeInfo.nodeId) return;

    const id = nodeIdToKadId(nodeId);

    this.kb.add({ id, nodeId, vectorClock: Date.now() });

    this.logger.info('RoutingTable.add', { nodeId });
  }

  /**
   * Remove a given peer from the table
   */
  remove(nodeId: NodeId): void {
    if (!this.kb) {
      throw new Error('RoutingTable is not started');
    }

    const id = nodeIdToKadId(nodeId);

    this.kb.remove(id);
  }

  /**
   * Keep track of our k-closest peers and tag them in the peer store as such
   * - this will lower the chances that connections to them get closed when
   * we reach connection limits
   */
  private updatePeerTags(): void {
    if (!this.kb) return;

    const newClosest = new Set<NodeId>();

    for (const peer of this.kb.closest(this.kb.localNodeId, KBUCKET_SIZE)) {
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
  private onPing(oldContacts: KBucketPeer[], newContact: KBucketPeer): void {
    // add to a queue so multiple ping requests do not overlap and we don't
    // flood the network with ping requests if lots of newContact requests
    // are received
    void this.pingQueue.run(async () => {
      if (!this.running) {
        return;
      }

      let responded = 0;

      await Promise.allSettled(
        oldContacts.map(async oldContact => {
          if (!this.running) return;
          if (oldContact.nodeId === this.kad.nodeInfo.nodeId) return;

          try {
            this.logger.info('RoutingTable.ping', { nodeId: oldContact.nodeId });
            const nodeInfo = this.kad.peerStore.get(oldContact.nodeId);
            await this.kad.network.sendRequest(nodeInfo, 'Kad.ping', undefined, {
              signal: Signals.timeout(this.pingTimeout),
            });
            responded++;
          } catch (error) {
            if (
              !this.running &&
              (error.code === 'ERR_QUERY_ABORTED' ||
                error.code === 'ABORT_ERR' ||
                error.code === 'ERR_DB_CLOSED' ||
                error instanceof CanceledPromiseError)
            ) {
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
        }),
      );

      if (this.running && responded < oldContacts.length && this.kb) {
        this.logger.info('RoutingTable.afterPing - newContact', { nodeId: newContact.nodeId });
        this.kb.add(newContact);
      }
    });
  }
}
