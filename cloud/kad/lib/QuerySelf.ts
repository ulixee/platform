import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import { debounce } from '@ulixee/commons/lib/asyncUtils';
import Logger from '@ulixee/commons/lib/Logger';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import Signals from '@ulixee/commons/lib/Signals';
import Identity from '@ulixee/crypto/lib/Identity';
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
  private readonly log: IBoundLog;
  private readonly count: number;
  private readonly interval: number;
  private readonly initialInterval: number;
  private readonly queryTimeout: number;
  private started: boolean;
  private running: boolean;
  private timeoutId?: NodeJS.Timer;
  private controller?: AbortController;
  private initialQuerySelfHasRun?: Resolvable<void>;

  constructor(private readonly kad: Kad, init: IQuerySelfInit) {
    const { count, interval, queryTimeout } = init;

    this.log = log.createChild(module);
    this.running = false;
    this.started = false;
    this.count = count ?? K;
    this.interval = interval ?? QUERY_SELF_INTERVAL;
    this.initialInterval = init.initialInterval ?? QUERY_SELF_INITIAL_INTERVAL;
    this.queryTimeout = queryTimeout ?? QUERY_SELF_TIMEOUT;
    this.initialQuerySelfHasRun = init.initialQuerySelfHasRun;

    this.querySelf = debounce(this.querySelf.bind(this), 100);
  }

  isStarted(): boolean {
    return this.started;
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    this.started = true;
    this.timeoutId = setTimeout(this.querySelf, this.initialInterval);
  }

  async stop(): Promise<void> {
    this.started = false;

    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }

    if (this.controller !== null) {
      this.controller.abort();
    }
  }

  querySelf(): void {
    if (!this.started || this.running) {
      return;
    }

    if (this.kad.routingTable.size === 0) {
      let nextInterval = this.interval;

      if (!this.initialQuerySelfHasRun.isResolved) {
        // if we've not yet run the first self query, shorten the interval until we try again
        nextInterval = this.initialInterval;
      }

      this.log.info('querySelf.skip - routingTableEmpty', { nextInterval });
      clearTimeout(this.timeoutId);
      this.timeoutId = setTimeout(this.querySelf, nextInterval);
      return;
    }

    this.controller = new AbortController();
    const signal = Signals.any(this.controller.signal, Signals.timeout(this.queryTimeout));

    // this controller will get used for lots of dial attempts so make sure we don't cause warnings to be logged
    setMaxListeners(Infinity, signal);

    const parentLogId = this.log.info(`querySelf.run(x/${this.count})`, {
      searchForPeers: this.count,
      timeout: this.queryTimeout,
    });

    const limit = this.count;
    void (async () => {
      try {
        this.running = true;
        let found = 0;
        const nodeKadId = Identity.getBytes(this.kad.nodeInfo.nodeId);
        for await (const _ of this.kad.peerRouting.getClosestPeers(nodeKadId, {
          signal,
          isSelfQuery: true,
        })) {
          if (++found === limit) {
            this.controller.abort();
            break;
          }
        }

        this.log.stats(`querySelf.complete(${found}/${this.count})`, {
          peersFound: found,
          parentLogId,
        });

        this.initialQuerySelfHasRun?.resolve();
      } catch (error) {
        if (this.started) {
          this.log.error('querySelf.error', { error, parentLogId });
        }
        // eslint-disable-next-line promise/always-return
      } finally {
        signal.clear();
        this.running = false;

        clearTimeout(this.timeoutId);

        if (this.started) {
          this.log.stats('querySelf.nextRun', { millis: this.interval });
          this.timeoutId = setTimeout(this.querySelf, this.interval);
        }
      }
    })();
  }
}
