import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import { CodeError } from '@ulixee/commons/lib/errors';
import Logger from '@ulixee/commons/lib/Logger';
import Signals from '@ulixee/commons/lib/Signals';
import Identity from '@ulixee/crypto/lib/Identity';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import NodeId from '../interfaces/NodeId';
import type { Kad } from './Kad';
import type { Network } from './network';
import { PeerDistanceList } from './PeerDistanceList';
import type { QueryManager, IQueryOptions } from './QueryManager';
import type { RoutingTable } from './RoutingTable';

const { log } = Logger(module);

export class PeerRouting {
  private readonly kad: Kad;
  private readonly logger: IBoundLog;
  private get routingTable(): RoutingTable {
    return this.kad.routingTable;
  }

  private get network(): Network {
    return this.kad.network;
  }

  private get queryManager(): QueryManager {
    return this.kad.queryManager;
  }

  constructor(kad: Kad) {
    this.kad = kad;
    this.logger = log;
  }

  /**
   * Search for a peer with the given ID
   */
  async *findPeer(
    id: NodeId,
    options: IQueryOptions = {},
  ): AsyncGenerator<{ fromNodeId: NodeId; nodeInfo: INodeInfo }> {
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
    const key = Identity.getBytes(id);
    const abortSignal = new AbortController();
    options.signal = options.signal
      ? Signals.any(abortSignal.signal, options.signal)
      : abortSignal.signal;

    for await (const result of this.queryManager.runOnClosestPeers(
      key,
      ({ nodeInfo, signal }) => {
        return this.network.sendRequest(nodeInfo, 'Kad.findNode', { key }, { signal });
      },
      options,
    )) {
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
      throw new CodeError('Not found', 'ERR_NOT_FOUND');
    }
  }

  /**
   * Kademlia 'node lookup' operation on a key, which should be a sha256 hash
   */
  async *getClosestPeers(key: Buffer, options: IQueryOptions = {}): AsyncGenerator<INodeInfo> {
    this.logger.stats('getClosestPeers', { key });

    const distanceList = new PeerDistanceList(key, this.routingTable.kBucketSize);
    for (const peer of this.routingTable.closestPeers(key)) distanceList.add(peer);

    for await (const result of this.queryManager.runOnClosestPeers(
      key,
      ({ nodeInfo, signal }) => {
        return this.network.sendRequest(nodeInfo, 'Kad.findNode', { key }, { signal });
      },
      options,
    )) {
      if (result.error) {
        this.logger.info('Error in getClosestPeers for node', result);
        continue;
      }
      for (const peer of result.closerPeers) {
        if (peer.nodeId !== this.kad.nodeId) distanceList.add(peer.nodeId);
      }
    }

    this.logger.stats('getClosestPeers', { found: distanceList.length, key });

    for (const nodeId of distanceList.peers) {
      const nodeInfo = this.kad.peerStore.get(nodeId);
      if (nodeInfo) yield nodeInfo;
    }
  }

  /**
   * Get the nearest peers to the given query, but closer than self
   */
  getCloserPeersOffline(key: Buffer, closerThan: NodeId, requestorNodeId: NodeId): INodeInfo[] {
    const ids = this.routingTable.closestPeers(key);
    const closerPeers: INodeInfo[] = [];

    for (const nodeId of ids) {
      if (nodeId === closerThan || nodeId === this.kad.nodeId || nodeId === requestorNodeId) {
        continue;
      }

      const nodeInfo = this.kad.peerStore.get(nodeId);
      if (nodeInfo) closerPeers.push(nodeInfo);
    }

    if (closerPeers.length > 0) {
      this.logger.info('getCloserPeersOffline:foundPeers', {
        key,
        closerPeers: closerPeers.length,
        closerThan,
      });
    } else {
      this.logger.info('getCloserPeersOffline:noneFound', {
        key,
        closerThan,
      });
    }

    return closerPeers;
  }
}
