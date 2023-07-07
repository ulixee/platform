import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import Logger from '@ulixee/commons/lib/Logger';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import NodeId from '../interfaces/NodeId';
import { Kad } from './Kad';
import KadRecord, { IKadRecord } from './KadRecord';
import { Network } from './Network';
import { PeerDistanceList } from './PeerDistanceList';
import { IQueryOptions, QueryManager } from './QueryManager';

const { log } = Logger(module);

export class ContentFetching {
  private readonly logger: IBoundLog;
  private readonly queryManager: QueryManager;
  private readonly network: Network;

  constructor(private readonly kad: Kad) {
    const { queryManager, network } = kad;

    this.logger = log.createChild(module, {});
    this.queryManager = queryManager;
    this.network = network;
  }

  async putLocal(
    key: Buffer,
    record: IKadRecord,
    options: { needsVerify: boolean; isOwnRecord?: boolean } = { needsVerify: true },
  ): Promise<void> {
    options.isOwnRecord ??= false;
    const existing = this.kad.db.records.get(key);
    if (existing) options.isOwnRecord ||= existing.isOwnRecord;

    if (options.needsVerify) await KadRecord.verify(key, record);
    await this.kad.db.records.put(key, record, options.isOwnRecord);
  }

  /**
   * Attempt to retrieve the value for the given key from
   * the local datastore
   */
  async getLocal(key: Buffer): Promise<IKadRecord> {
    this.logger.stats('getLocal', { key });

    const record = this.kad.db.records.get(key);
    if (!record) return null;

    return {
      timestamp: record.timestamp,
      publicKey: record.publicKey,
      value: record.value,
      signature: record.signature,
    };
  }

  /**
   * Store the given key/value pair in the DHT
   */
  async *put(
    key: Buffer,
    record: IKadRecord,
    options: IQueryOptions = {},
  ): AsyncGenerator<{ notifiedPeer: NodeId }, void, undefined> {
    // store the record locally
    this.logger.stats(`ContentFetching.put`, { key });
    // make sure we're publishing a valid record
    await this.putLocal(key, record, { needsVerify: true, isOwnRecord: true });

    const resultIterator = this.queryManager.runOnClosestPeers(
      key,
      async ({ nodeInfo, signal }) => {
        const nodeId = nodeInfo.nodeId;
        const parentLogId = this.logger.info('ContentFetching.put', { key, nodeId });
        const result = await this.network.sendRequest(
          nodeInfo,
          'Kad.put',
          { key, record },
          { signal },
        );
        this.logger.stats('ContentFetching.put', { key, nodeId, parentLogId });

        return { record: result.newerRecord, closerPeers: [] };
      },
      options,
    );

    for await (const result of resultIterator) {
      if (result.error) {
        this.logger.info('Error in provide for node', result);
        continue;
      }

      yield { notifiedPeer: result.fromNodeId };
    }
  }

  /**
   * Get the value to the given key. Implement proactive caching - "Proactive Caching in the Kademlia DHT" by Gummad
   */
  async *get(key: Buffer, options: IQueryOptions = {}): AsyncGenerator<IValueRecord> {
    const parentLogId = this.logger.stats('ContentFetching.get', { key });

    const getResults: IValueRecord[] = [];
    const closest10Nodes = new PeerDistanceList(key, 10);

    for await (const event of this.getMany(key, options)) {
      getResults.push(event);
      closest10Nodes.add(event.fromNodeId);
      if (event.closerPeers) {
        for (const closer of event.closerPeers) {
          closest10Nodes.add(closer.nodeId);
        }
      }
      if (event.record) yield event;
    }

    const withResult = getResults
      .filter(x => x.record)
      .sort((a, b) => b.record.timestamp - a.record.timestamp);
    const best = withResult[0]?.record;

    if (!best) {
      return;
    }

    this.logger.stats('GetValue', { key, best, parentLogId });

    const cacheNodes = new Set(closest10Nodes.peers);

    for (const { record, fromNodeId } of getResults) {
      if (this.kad.nodeId === fromNodeId) {
        if (record?.timestamp !== best.timestamp) {
          await this.putLocal(key, best, { needsVerify: false });
        }
        continue;
      }

      // determine if an update should be sent
      let shouldSendCorrection = record && record.timestamp !== best.timestamp;

      // if node is in top 10 closest nodes found, and they do not have the record - send it
      if (!record && cacheNodes.has(fromNodeId)) shouldSendCorrection = true;

      if (!shouldSendCorrection) continue;

      const nodeInfo = this.kad.peerStore.get(fromNodeId);
      const result = await this.network.sendRequest(
        nodeInfo,
        'Kad.put',
        { key, record: best },
        options,
      );

      if (result.newerRecord && result.newerRecord.timestamp !== best.timestamp) {
        yield { record: result.newerRecord, fromNodeId: result.fromNodeId };
      }
    }
  }

  /**
   * Get the `n` values to the given key without sorting. Includes results with nothing found
   */
  private async *getMany(
    key: Buffer,
    options: IQueryOptions = {},
  ): AsyncGenerator<
    IValueRecord & {
      closerPeers: INodeInfo[];
    }
  > {
    try {
      const local = await this.getLocal(key);
      yield {
        record: local,
        fromNodeId: this.kad.nodeId,
        closerPeers: [],
      };
    } catch (error: any) {
      this.logger.info('ContentFetching.getMany:Error', { error, key });
    }

    const resultIterator = this.queryManager.runOnClosestPeers(
      key,
      async ({ nodeInfo, signal }) => {
        const result = await this.network.sendRequest(nodeInfo, 'Kad.get', { key }, { signal });

        // make sure this is valid. Will throw if not
        if (result.record) KadRecord.verify(key, result.record);

        return result;
      },
      options,
    );

    for await (const result of resultIterator) {
      if (result.error) {
        this.logger.info('ContentFetching.getMany:PeerError', result);
        continue;
      }

      yield {
        record: result.record,
        fromNodeId: result.fromNodeId,
        closerPeers: result.closerPeers,
      };
    }
  }
}

interface IValueRecord {
  record: IKadRecord;
  fromNodeId: NodeId;
}
