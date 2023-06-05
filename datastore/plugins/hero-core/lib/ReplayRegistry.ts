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
  private readonly storePromises = new Set<Promise<any>>();

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
    const storage = [...this.storePromises];
    this.storePromises.clear();
    await Promise.allSettled(storage);
  }

  public create(sessionId: string, customPath?: string): SessionDb {
    return this.defaultSessionRegistry.create(sessionId, customPath);
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

  public async onClosed(sessionId: string, isDeleteRequested: boolean): Promise<void> {
    const timestamp = Date.now();
    const entry = await this.defaultSessionRegistry.get(sessionId);
    const sessionRecord = entry?.session.get();
    if (sessionRecord.scriptRuntime === 'datastore') {
      this.enqueue(this.store(sessionId, timestamp, entry.path));
    }
    await this.defaultSessionRegistry.onClosed(sessionId, isDeleteRequested);
  }

  private async store(sessionId: string, timestamp: number, path: string): Promise<void> {
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

  private enqueue(promise: Promise<any>): void {
    this.storePromises.add(promise);
    void promise.then(() => this.storePromises.delete(promise)).catch(console.error);
  }
}
