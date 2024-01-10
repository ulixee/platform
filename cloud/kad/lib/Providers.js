"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Providers = void 0;
const Logger_1 = require("@ulixee/commons/lib/Logger");
const LruCache_1 = require("@ulixee/commons/lib/LruCache");
const Queue_1 = require("@ulixee/commons/lib/Queue");
const constants_1 = require("./constants");
const { log } = (0, Logger_1.default)(module);
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
class Providers {
    constructor(kad, init = {}) {
        this.kad = kad;
        this.onExpiredFns = [];
        const { cacheSize, cleanupInterval, provideValidity } = init;
        this.cleanupInterval = cleanupInterval ?? constants_1.PROVIDERS_CLEANUP_INTERVAL;
        this.provideValidity = provideValidity ?? constants_1.PROVIDERS_VALIDITY;
        this.cache = new LruCache_1.default(cacheSize ?? constants_1.PROVIDERS_LRU_CACHE_SIZE);
        this.syncQueue = new Queue_1.default('PROVIDERS', 1);
        this.started = false;
    }
    isStarted() {
        return this.started;
    }
    /**
     * Start the provider cleanup service
     */
    async start() {
        if (this.started) {
            return;
        }
        this.started = true;
        this.cleaner = setInterval(() => {
            try {
                this.cleanup();
            }
            catch (error) {
                if (!this.started)
                    return;
                log.error('Providers.cleanupError', { error });
            }
        }, this.cleanupInterval);
    }
    onExpire(onProvideExpired) {
        this.onExpiredFns.push(onProvideExpired);
    }
    /**
     * Release any resources.
     */
    async stop() {
        this.started = false;
        if (this.cleaner !== null) {
            clearInterval(this.cleaner);
            this.cleaner = undefined;
        }
    }
    /**
     * Check all providers if they are still valid, and if not delete them
     */
    cleanup() {
        const start = Date.now();
        let deleteCount = 0;
        const deleted = new Map();
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
                    const newProviderList = deleted.get(keyB64) ?? new Set();
                    newProviderList.add(providerNodeId);
                    deleted.set(keyB64, newProviderList);
                }
            }
            catch (error) {
                log.error('CleanupError', { error });
            }
        }
        // Clear expired entries from the cache
        for (const [key, peers] of deleted) {
            const provs = this.cache.get(key);
            if (!provs)
                continue;
            for (const nodeId of peers) {
                provs.delete(nodeId);
            }
            if (provs.size === 0) {
                this.cache.remove(key);
            }
            else {
                this.cache.set(key, provs);
            }
        }
        log.stats('Cleanup successful', { parentLogId, deleteCount, sessionId: undefined });
    }
    /**
     * Add a new provider for the given key
     */
    addProvider(key, providerNodeId) {
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
    getProviders(key) {
        return [...this.getProvidersMap(key).keys()];
    }
    /**
     * Get the currently known provider peer ids for a given key
     */
    getProvidersMap(key) {
        const cacheKey = key.toString('base64');
        let provs = this.cache.get(cacheKey);
        if (!provs) {
            provs = loadProviders(this.kad.db, key);
            this.cache.set(cacheKey, provs);
        }
        return provs;
    }
}
exports.Providers = Providers;
function loadProviders(db, key) {
    const providers = new Map();
    const query = db.providers.getWithKey(key);
    for (const { providerNodeId, expirationTimestamp } of query) {
        providers.set(providerNodeId, new Date(expirationTimestamp));
    }
    return providers;
}
//# sourceMappingURL=Providers.js.map