import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import { bufferToBigInt, xor } from '@ulixee/commons/lib/bufferUtils';
import { AbortError } from '@ulixee/commons/lib/errors';
import Logger from '@ulixee/commons/lib/Logger';
import Queue from '@ulixee/commons/lib/Queue';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import Signals, { IClearableSignal } from '@ulixee/commons/lib/Signals';
import TypedEventEmitter from '@ulixee/commons/lib/TypedEventEmitter';
import Identity from '@ulixee/crypto/lib/Identity';
import INodeInfo from '@ulixee/platform-specification/types/INodeInfo';
import { setMaxListeners } from 'node:events';
import NodeId from '../interfaces/NodeId';
import { ALPHA, DEFAULT_QUERY_TIMEOUT, K } from './constants';
import type { Kad } from './Kad';
import type { RoutingTable } from './RoutingTable';

const MAX_XOR = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
const log = Logger(module).log;

export interface IQueryManagerInit {
  disjointPaths?: number;
  alpha?: number;
  initialQuerySelfHasRun: Resolvable<void>;
  routingTable: RoutingTable;
}

/**
 * Keeps track of all running queries
 */
export class QueryManager {
  public disjointPaths: number;
  private readonly alpha: number;
  private readonly shutDownController: AbortController;
  private running: boolean;
  private activeQueries = 0;
  private queryIdCounter = 0;

  private readonly routingTable: RoutingTable;
  private initialQuerySelfHasRun: Resolvable<void>;

  constructor(private readonly kad: Pick<Kad, 'nodeId' | 'peerStore'>, init: IQueryManagerInit) {
    const { disjointPaths = K, alpha = ALPHA } = init;

    this.disjointPaths = disjointPaths ?? K;
    this.running = false;
    this.alpha = alpha ?? ALPHA;

    this.initialQuerySelfHasRun = init.initialQuerySelfHasRun;
    this.routingTable = init.routingTable;

    // allow us to stop queries on shut down
    this.shutDownController = new AbortController();
    // make sure we don't make a lot of noise in the logs
    setMaxListeners(Infinity, this.shutDownController.signal);
  }

  isStarted(): boolean {
    return this.running;
  }

  async start(): Promise<void> {
    this.running = true;
  }

  async stop(): Promise<void> {
    this.running = false;

    this.shutDownController.abort();
  }

  async *runOnClosestPeers<T extends { closerPeers?: INodeInfo[] } = { closerPeers?: INodeInfo[] }>(
    key: Buffer,
    queryFunc: IKadQueryFn<T>,
    options: IQueryOptions = {},
  ): AsyncGenerator<T & { fromNodeId: NodeId; error?: Error }> {
    if (!this.running) {
      throw new Error('QueryManager not started');
    }

    const signals: AbortSignal[] = [
      this.shutDownController.signal,
      options.signal ?? Signals.timeout(DEFAULT_QUERY_TIMEOUT),
    ];
    if (options?.queryTimeout) {
      signals.push(Signals.timeout(options.queryTimeout));
    }

    const signal = Signals.any(...signals);
    setMaxListeners(Infinity, signal);

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
            reject(new AbortError('Query was aborted before self-query ran'));
          });
        }),
        this.initialQuerySelfHasRun.promise,
      ]);
    }

    const cleanUp = new TypedEventEmitter<ICleanUpEvents>();
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
      const peersSeen = new Set<string>();

      // Only ALPHA node/value lookups are allowed at any given time for each process
      const queue = new Queue<T & { fromNodeId: NodeId }>('QUERY PATH', this.alpha, signal);

      const queryOptions: IQueryPathOptions = {
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
        if (!peer || peersSeen.has(peer) || peer === this.kad.nodeId) continue;
        const nodeInfo = this.kad.peerStore.get(peer);
        this.queueQueryPeer(queue, nodeInfo, queryOptions);
      }

      // Execute the query along each disjoint path and yield their results as they become available
      for await (const result of queue.toGenerator(cleanUp)) {
        yield result;
      }
    } catch (error) {
      if (error instanceof CanceledPromiseError) {
        // ignore all canceled errors.
      } else if (
        !this.running &&
        (error.code === 'ERR_QUERY_ABORTED' ||
          error.code === 'ABORT_ERR' ||
          error.code === 'ERR_DB_CLOSED')
      ) {
        // ignore query aborted errors that were thrown during query manager shutdown
      } else {
        throw error;
      }
    } finally {
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
  private queueQueryPeer(queue: Queue, peerNodeInfo: INodeInfo, options: IQueryPathOptions): void {
    const { logger, signal, query, key, peersSeen } = options;
    const peerNodeId = peerNodeInfo?.nodeId;
    if (!peerNodeInfo || peersSeen.has(peerNodeId) || peerNodeId === this.kad.nodeId) return;

    peersSeen.add(peerNodeId);

    const peerKadId = Identity.getBytes(peerNodeId);
    const peerXor = bufferToBigInt(xor(peerKadId, key));

    queue
      .run(
        async () => {
          let result = await query({
            key,
            nodeInfo: peerNodeInfo,
            signal,
          }).catch(err => {
            return {
              error: err,
              closerPeers: undefined as INodeInfo[],
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

            const closerPeerKadId = await Identity.getBytes(closerPeer.nodeId);
            const closerPeerXor = bufferToBigInt(xor(closerPeerKadId, key));
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
        },
        {
          // use xor value as the queue priority - closer peers should execute first
          // subtract it from MAX_XOR because higher priority values execute sooner
          priority: MAX_XOR - peerXor,
        },
      )
      .catch(error => {
        // ignore discarded items
        if (error instanceof CanceledPromiseError) return;
        // ignore query aborted errors that were thrown during query manager shutdown
        if (
          !this.running &&
          (error.code === 'ERR_QUERY_ABORTED' ||
            error.code === 'ABORT_ERR' ||
            error.code === 'ERR_DB_CLOSED')
        )
          return;

        error.stack += `\n  ${options.startStack}`;
        logger.error(`queueQueryPeer:Error`, { error });
      });
  }
}

export interface IQueryOptions {
  queryTimeout?: number;
  isSelfQuery?: boolean;
  signal?: AbortSignal;
}

export interface IKadQueryFn<T extends { closerPeers?: INodeInfo[] }> {
  (context: { key: Buffer; nodeInfo: INodeInfo; signal: AbortSignal }): Promise<T>;
}

interface ICleanUpEvents {
  cleanup: void;
}

interface IQueryPathOptions<T extends { closerPeers?: INodeInfo[] } = { closerPeers?: INodeInfo[] }>
  extends IQueryOptions {
  key: Buffer;
  signal: IClearableSignal;
  query: IKadQueryFn<T>;
  cleanUp: TypedEventEmitter<ICleanUpEvents>;
  logger: IBoundLog;
  peersSeen: Set<string>;
  startStack: string;
}
