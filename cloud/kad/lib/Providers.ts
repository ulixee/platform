import Logger from '@ulixee/commons/lib/Logger';
import LruCache from '@ulixee/commons/lib/LruCache';
import Queue from '@ulixee/commons/lib/Queue';
import KadDb from '../db/KadDb';
import IKadOptions from '../interfaces/IKadOptions';
import NodeId from '../interfaces/NodeId';
import {
  PROVIDERS_CLEANUP_INTERVAL,
  PROVIDERS_LRU_CACHE_SIZE,
  PROVIDERS_VALIDITY,
} from './constants';
import type { Kad } from './Kad';

const { log } = Logger(module);

/**
 * This class manages known providers.
 * A provider is a peer that we know to have the content for a given key.
 *
 * Every `cleanupInterval` providers are checked if they
 * are still valid, i.e. younger than the `provideValidity`.
 * If they are not, they are deleted.
 *
 * To ensure the list survives restarts of the daemon,
 * providers are stored in the datastore, but to ensure
 * access is fast there is an LRU cache in front of that.
 */
export class Providers {
  private readonly cache: LruCache<Map<string, Date>>;
  private readonly cleanupInterval: number;
  private readonly provideValidity: number;
  private readonly syncQueue: Queue;
  private started: boolean;
  private cleaner?: NodeJS.Timeout;
  private onExpiredFns: ((event: { key: Buffer; providerNodeId: string }) => Promise<any>)[] = [];

  constructor(
    private kad: Pick<Kad, 'db'>,
    init: IKadOptions['providers'] = {},
  ) {
    const { cacheSize, cleanupInterval, provideValidity } = init;

    this.cleanupInterval = cleanupInterval ?? PROVIDERS_CLEANUP_INTERVAL;
    this.provideValidity = provideValidity ?? PROVIDERS_VALIDITY;
    this.cache = new LruCache(cacheSize ?? PROVIDERS_LRU_CACHE_SIZE);
    this.syncQueue = new Queue('PROVIDERS', 1);
    this.started = false;
  }

  isStarted(): boolean {
    return this.started;
  }

  /**
   * Start the provider cleanup service
   */
  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    this.started = true;

    this.cleaner = setInterval(() => {
      try {
        this.cleanup();
      } catch (error) {
        if (!this.started) return;
        log.error('Providers.cleanupError', { error });
      }
    }, this.cleanupInterval);
  }

  onExpire(
    onProvideExpired: (event: { key: Buffer; providerNodeId: string }) => Promise<any>,
  ): void {
    this.onExpiredFns.push(onProvideExpired);
  }

  /**
   * Release any resources.
   */
  async stop(): Promise<void> {
    this.started = false;

    if (this.cleaner !== null) {
      clearInterval(this.cleaner);
      this.cleaner = undefined;
    }
  }

  /**
   * Check all providers if they are still valid, and if not delete them
   */
  cleanup(): void {
    const start = Date.now();

    let deleteCount = 0;
    const deleted = new Map<string, Set<string>>();

    // Get all provider entries from the datastore
    const query = this.kad.db.providers.all();
    const parentLogId = log.info('cleanup:start');

    for (const { key, providerNodeId, expirationTimestamp } of query) {
      try {
        const keyB64 = key.toString('base64');
        const expired = start > expirationTimestamp;

        log.stats('cleanup', {
          key,
          start,
          expirationTimestamp,
          expired,
          sessionId: undefined,
        });

        if (expired) {
          deleteCount++;
          this.kad.db.providers.delete(providerNodeId, key);
          void Promise.allSettled(this.onExpiredFns.map(x => x({ key, providerNodeId })));
          const newProviderList = deleted.get(keyB64) ?? new Set<string>();
          newProviderList.add(providerNodeId);
          deleted.set(keyB64, newProviderList);
        }
      } catch (error) {
        log.error('CleanupError', { error });
      }
    }

    // Clear expired entries from the cache
    for (const [key, peers] of deleted) {
      const provs = this.cache.get(key);
      if (!provs) continue;

      for (const nodeId of peers) {
        provs.delete(nodeId);
      }

      if (provs.size === 0) {
        this.cache.remove(key);
      } else {
        this.cache.set(key, provs);
      }
    }

    log.stats('Cleanup successful', { parentLogId, deleteCount, sessionId: undefined });
  }

  /**
   * Add a new provider for the given key
   */
  addProvider(key: Buffer, providerNodeId: NodeId): void {
    log.stats('addProvider', { providerNodeId, key, sessionId: undefined });
    const providersMap = this.getProvidersMap(key);

    const now = new Date();
    providersMap.set(providerNodeId, now);

    this.cache.set(key.toString('base64'), providersMap);
    this.kad.db.providers.record({
      key,
      providerNodeId,
      publishedTimestamp: now.getTime(),
      expirationTimestamp: now.getTime() + this.provideValidity,
    });
  }

  /**
   * Get a list of providers for the given key
   */
  getProviders(key: Buffer): NodeId[] {
    return [...this.getProvidersMap(key).keys()];
  }

  /**
   * Get the currently known provider peer ids for a given key
   */
  private getProvidersMap(key: Buffer): Map<string, Date> {
    const cacheKey = key.toString('base64');
    let provs = this.cache.get(cacheKey);

    if (!provs) {
      provs = loadProviders(this.kad.db, key);
      this.cache.set(cacheKey, provs);
    }

    return provs;
  }
}

function loadProviders(db: KadDb, key: Buffer): Map<string, Date> {
  const providers = new Map<string, Date>();
  const query = db.providers.getWithKey(key);

  for (const { providerNodeId, expirationTimestamp } of query) {
    providers.set(providerNodeId, new Date(expirationTimestamp));
  }

  return providers;
}
