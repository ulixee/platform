import TypedEventEmitter from '@ulixee/commons/lib/TypedEventEmitter';
import DefaultSessionRegistry from '@ulixee/hero-core/dbs/DefaultSessionRegistry';
import SessionDb from '@ulixee/hero-core/dbs/SessionDb';
import ISessionRegistry from '@ulixee/hero-core/interfaces/ISessionRegistry';
import { ConnectionToCore } from '@ulixee/net';
import { IReplayRegistryApis } from '@ulixee/platform-specification/services/ReplayRegistryApis';
import ReplayRegistryDiskStore from './ReplayRegistryDiskStore';
import ReplayRegistryServiceClient from './ReplayRegistryServiceClient';

export default class ReplayRegistry
  extends TypedEventEmitter<{
    new: { sessionId: string; dbPath: string };
  }>
  implements ISessionRegistry
{
  public get defaultDir(): string {
    return this.defaultSessionRegistry.defaultDir;
  }

  public readonly replayStorageRegistry?: ReplayRegistryDiskStore;
  private readonly serviceClient?: ReplayRegistryServiceClient;
  private readonly storePromises = new Map<string, Promise<any>[]>();

  private defaultSessionRegistry: DefaultSessionRegistry;

  constructor(
    private config: {
      serviceClient?: ConnectionToCore<IReplayRegistryApis, {}>;
      queryHeroStorageDir: string;
      defaultHeroStorageDir: string;
    },
  ) {
    super();
    this.serviceClient = config.serviceClient
      ? new ReplayRegistryServiceClient(config.serviceClient)
      : null;
    if (!this.serviceClient) {
      this.replayStorageRegistry = new ReplayRegistryDiskStore(config.queryHeroStorageDir);
    }
    this.defaultSessionRegistry = new DefaultSessionRegistry(config.defaultHeroStorageDir);
  }

  public async shutdown(): Promise<void> {
    await this.flush();
    this.config = null;
  }

  public async flush(): Promise<void> {
    const storage = [...this.storePromises.values()];
    this.storePromises.clear();
    await Promise.allSettled(storage);
  }

  public create(sessionId: string, customPath?: string): SessionDb {
    return this.defaultSessionRegistry.create(sessionId, customPath);
  }

  public async retain(sessionId: string, customPath?: string): Promise<SessionDb> {
    const record = await this.defaultSessionRegistry
      .retain(sessionId, customPath)
      .catch(() => null);
    if (record) return record;

    for (const store of [this.replayStorageRegistry, this.serviceClient]) {
      if (!store) continue;
      const entry = await store.get(sessionId);
      if (entry?.db) {
        await this.defaultSessionRegistry.store(sessionId, entry.db);
        return this.defaultSessionRegistry.retain(sessionId);
      }
    }
  }

  public async get(sessionId: string, customPath?: string): Promise<SessionDb> {
    const record = await this.defaultSessionRegistry.get(sessionId, customPath).catch(() => null);
    if (record) return record;

    for (const store of [this.replayStorageRegistry, this.serviceClient]) {
      if (!store) continue;
      const entry = await store.get(sessionId);
      if (entry?.db) return await this.defaultSessionRegistry.store(sessionId, entry.db);
    }
  }

  public async ids(): Promise<string[]> {
    const idSet = new Set<string>(await this.defaultSessionRegistry.ids());

    for (const store of [this.replayStorageRegistry, this.serviceClient]) {
      if (!store) continue;
      const entries = await store.ids();
      for (const id of entries.sessionIds) {
        idSet.add(id);
      }
    }
    return [...idSet];
  }

  public async close(sessionId: string, isDeleteRequested: boolean): Promise<void> {
    if (this.storePromises.has(sessionId)) {
      await Promise.allSettled(this.storePromises.get(sessionId));
      this.storePromises.delete(sessionId);
    }
    await this.defaultSessionRegistry.close(sessionId, isDeleteRequested);
  }

  public async delete(sessionId: string): Promise<void> {
    if (this.storePromises.has(sessionId)) {
      await Promise.allSettled(this.storePromises.get(sessionId));
      this.storePromises.delete(sessionId);
    }
    await this.defaultSessionRegistry.close(sessionId, true);
    if (this.serviceClient) {
      await this.serviceClient.delete(sessionId);
    } else {
      await this.replayStorageRegistry.delete(sessionId);
    }
  }

  public async store(sessionId: string): Promise<void> {
    if (!this.storePromises.has(sessionId)) {
      this.storePromises.set(sessionId, []);
    }
    this.storePromises
      .get(sessionId)
      .push(
        this.storeInternal(sessionId).catch(e => console.warn(`Error storing cached session`, e)),
      );
  }

  private async storeInternal(sessionId: string): Promise<void> {
    const entry = await this.defaultSessionRegistry.get(sessionId);
    if (!entry?.session) throw new Error(`Session not able to be retained: ${sessionId}`);

    const path = entry.path;
    const timestamp = Date.now();

    const db = await ReplayRegistryDiskStore.getCompressedDb(path);
    if (this.serviceClient) {
      await this.serviceClient.store({
        sessionId,
        timestamp,
        db,
      });
    } else {
      await this.replayStorageRegistry.store(sessionId, db);
    }
  }
}
