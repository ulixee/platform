import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import Logger from '@ulixee/commons/lib/Logger';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import NodeId from '../interfaces/NodeId';
import type { Kad } from './Kad';
import type { Network } from './network';
import type { PeerRouting } from './PeerRouting';
import type { Providers } from './providers';
import type { QueryManager, QueryOptions } from './QueryManager';
import type { RoutingTable } from './RoutingTable';

const { log } = Logger(module);
export class ContentRouting {
  private readonly log: IBoundLog;
  private readonly network: Network;
  private readonly peerRouting: PeerRouting;
  private readonly queryManager: QueryManager;
  private readonly routingTable: RoutingTable;
  private readonly providers: Providers;

  constructor(private readonly kad: Kad) {
    this.log = log.createChild(module, {});
    this.network = kad.network;
    this.peerRouting = kad.peerRouting;
    this.queryManager = kad.queryManager;
    this.routingTable = kad.routingTable;
    this.providers = kad.providers;
  }

  /**
   * Announce to the network that we can provide the value for a given key and
   * are contactable on the given multiaddrs
   */
  async *provide(
    key: Buffer,
    options: QueryOptions = {},
  ): AsyncGenerator<{ notifiedPeer: NodeId }, void, undefined> {
    this.log.info('ContentRouting.provide', { key });
    // Add self as provider
    await this.providers.addProvider(key, this.kad.nodeInfo.nodeId);

    let sent = 0;

    const resultIterator = this.queryManager.runOnClosestPeers(
      key,
      async ({ nodeInfo, signal }) => {
        const nodeId = nodeInfo.nodeId;
        const parentLogId = this.log.info('ContentRouting.provide', { key, nodeId });
        try {
          const result = await this.network.sendRequest(
            nodeInfo,
            'Kad.provide',
            { key },
            { signal },
          );
          this.log.stats('ContentRouting.provided', { key, nodeId, parentLogId, sent });
          sent++;
          return result;
        } catch (error) {
          this.log.error('ContentRouting.provideError', { nodeId, error, parentLogId, sent });
        }
      },
      options,
    );

    for await (const peer of resultIterator) {
      yield { notifiedPeer: peer.fromNodeId };
    }
  }

  /**
   * Search the dht for up to `K` providers of the given CID.
   */
  async *findProviders(
    key: Buffer,
    options: QueryOptions,
  ): AsyncGenerator<{ fromNodeId: NodeId; providers: INodeInfo[] }> {
    const toFind = this.routingTable.kBucketSize;

    const parentLogId = this.log.info('ContentRouting.findProviders:start', { key });

    const providerNodeIds = this.providers.getProviders(key);

    // yield values if we have some, also slice because maybe we got lucky and already have too many?
    if (providerNodeIds.length > 0) {
      const providers: INodeInfo[] = [];

      for (const nodeId of providerNodeIds.slice(0, toFind)) {
        const nodeInfo = this.kad.peerStore.get(nodeId);
        if (nodeInfo) providers.push(nodeInfo);
      }

      yield { fromNodeId: this.kad.nodeInfo.nodeId, providers };
    }

    // All done
    if (providerNodeIds.length >= toFind) {
      return;
    }

    const providers = new Set(providerNodeIds);

    for await (const result of this.queryManager.runOnClosestPeers(
      key,
      ({ nodeInfo, signal }) => {
        return this.network.sendRequest(nodeInfo, 'Kad.getProviders', { key }, { signal });
      },
      options,
    )) {
      this.log.stats('ContentRouting.findProviders', {
        parentLogId,
        providers: result.providerPeers.length,
        key,
        closerPeers: result.closerPeers.length,
      });

      const newProviders = [];

      for (const nodeInfo of result.providerPeers) {
        if (providers.has(nodeInfo.nodeId) || nodeInfo.nodeId === this.kad.nodeId) {
          continue;
        }

        providers.add(nodeInfo.nodeId);
        newProviders.push(nodeInfo);
      }

      if (newProviders.length > 0) {
        yield { fromNodeId: result.fromNodeId, providers: newProviders };
      }

      if (providers.size === toFind) {
        return;
      }
    }
  }
}
