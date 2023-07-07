import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import Logger from '@ulixee/commons/lib/Logger';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import Signals from '@ulixee/commons/lib/Signals';
import { setMaxListeners } from 'node:events';
import {
  K,
  QUERY_SELF_INITIAL_INTERVAL,
  QUERY_SELF_INTERVAL,
  QUERY_SELF_TIMEOUT,
} from './constants';
import type { Kad } from './Kad';

export interface IQuerySelfInit {
  count?: number;
  interval?: number;
  initialInterval?: number;
  queryTimeout?: number;
  initialQuerySelfHasRun: Resolvable<void>;
}

const { log } = Logger(module);
/**
 * Receives notifications of new peers joining the network that support the DHT protocol
 */
export class QuerySelf {
  private readonly logger: IBoundLog;
  private readonly count: number;
  private readonly interval: number;
  private readonly initialInterval: number;
  private readonly queryTimeout: number;
  private started: boolean;
  private timeoutId?: NodeJS.Timer;
  private controller?: AbortController;
  private initialQuerySelfHasRun?: Resolvable<void>;
  private querySelfPromise: Resolvable<void>;

  constructor(private readonly kad: Kad, init: IQuerySelfInit) {
    const { count, interval, queryTimeout } = init;

    this.logger = log.createChild(module, { nodeId: kad.nodeId });
    this.started = false;
    this.count = count ?? K;
    this.interval = interval ?? QUERY_SELF_INTERVAL;
    this.initialInterval = init.initialInterval ?? QUERY_SELF_INITIAL_INTERVAL;
    this.queryTimeout = queryTimeout ?? QUERY_SELF_TIMEOUT;
    this.initialQuerySelfHasRun = init.initialQuerySelfHasRun;
  }

  isStarted(): boolean {
    return this.started;
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    this.started = true;
    this.schedule();
  }

  async stop(): Promise<void> {
    this.started = false;

    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }

    this.controller?.abort();
  }

  async querySelf(): Promise<void> {
    if (!this.started) return;

    if (this.querySelfPromise) {
      return this.querySelfPromise.promise;
    }

    this.querySelfPromise = new Resolvable();

    if (this.kad.routingTable.size === 0) {
      await new Promise(resolve => this.kad.routingTable.kb.once('peer:add', resolve));
    }

    if (this.started) {
      this.controller = new AbortController();
      const signal = Signals.any(this.controller.signal, Signals.timeout(this.queryTimeout));

      // this controller will get used for lots of dial attempts so make sure we don't cause warnings to be logged
      setMaxListeners(Infinity, signal);

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
      } catch (error) {
        if (this.started && error.code !== 'ERR_QUERY_ABORTED') {
          this.logger.error('querySelf.error', { error, parentLogId });
        }
      } finally {
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

  private schedule(): void {
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(
      () =>
        this.querySelf().catch(error => {
          if (this.started && error.code !== 'ERR_QUERY_ABORTED') {
            this.logger.error('QuerySelfError', { error });
          }
        }),
      this.initialInterval,
    );
  }
}
