import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import { toUrl } from '@ulixee/commons/lib/utils';
import Datastore, { ConnectionToDatastoreCore } from '@ulixee/datastore';
import IStorageEngine from '@ulixee/datastore/interfaces/IStorageEngine';
import RemoteStorageEngine from '@ulixee/datastore/storage-engines/RemoteStorageEngine';
import SqliteStorageEngine from '@ulixee/datastore/storage-engines/SqliteStorageEngine';
import IDatastoreApiTypes, {
  IDatastoreQueryMetadata,
} from '@ulixee/platform-specification/datastore/DatastoreApis';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import * as Fs from 'fs';
import * as Path from 'path';
import env from '../env';
import { IDatastoreManifestWithRuntime } from './DatastoreRegistry';
import DatastoreVm from './DatastoreVm';

export default class StorageEngineRegistry {
  public readonly dataDir: string;

  #nodeAddress: URL;
  #localStorageByIdAndVersion = new Map<string, IStorageEngine>();
  #remoteConnectionsByHost = new Map<string, ConnectionToDatastoreCore>();

  constructor(dataDir: string, nodeAddress: URL) {
    this.dataDir = Path.join(dataDir, 'storage');
    this.#nodeAddress = nodeAddress;
    if (!Fs.existsSync(this.dataDir)) Fs.mkdirSync(this.dataDir, { recursive: true });
  }

  public async close(): Promise<void> {
    await Promise.allSettled([...this.#localStorageByIdAndVersion.values()].map(x => x.close()));
    await Promise.allSettled([...this.#remoteConnectionsByHost.values()].map(x => x.disconnect()));
    this.#localStorageByIdAndVersion.clear();
  }

  public isHostingStorageEngine(storageEngineHost: string): boolean {
    if (storageEngineHost) {
      const engineUrl = toUrl(storageEngineHost);
      return engineUrl.host === this.#nodeAddress.host;
    }
    return true;
  }

  public get(
    manifest: Pick<IDatastoreManifest, 'id' | 'version' | 'storageEngineHost'>,
    queryMetadata: IDatastoreQueryMetadata,
  ): IStorageEngine {
    const { storageEngineHost, id, version } = manifest;

    const key = `${id}@${version}`;

    if (this.#localStorageByIdAndVersion.has(key)) {
      return this.#localStorageByIdAndVersion.get(key);
    }

    let engine: IStorageEngine;
    // if no endpoint, or it's this machine, use file storage
    if (this.isHostingStorageEngine(storageEngineHost)) {
      engine = new SqliteStorageEngine(Path.join(this.dataDir, `${key}.db`));
      this.#localStorageByIdAndVersion.set(key, engine);
    } else {
      const connection = this.getRemoteConnection(storageEngineHost);
      engine = new RemoteStorageEngine(connection, queryMetadata);
    }
    return engine;
  }

  public async deleteExisting(datastoreId: string, version: string): Promise<void> {
    const key = `${datastoreId}@${version}`;
    const entry = this.#localStorageByIdAndVersion.get(key);
    if (!entry) {
      const localDbPath = Path.join(this.dataDir, `${key}.db`);
      if (await existsAsync(localDbPath)) await Fs.promises.rm(localDbPath).catch(() => null);
      return;
    }
    await entry.close();
    this.#localStorageByIdAndVersion.delete(key);
    if (entry instanceof SqliteStorageEngine) {
      await Fs.promises.rm(entry.path).catch(() => null);
    }
  }

  public async createRemote(
    manifest: IDatastoreManifest,
    version: IDatastoreApiTypes['Datastore.upload']['args'],
    previousVersion: IDatastoreApiTypes['Datastore.upload']['args'],
  ): Promise<void> {
    const client = this.get(manifest, {
      id: manifest.id,
      version: manifest.version,
      queryId: 'StorageEngine.createRemote',
    }) as RemoteStorageEngine;
    if (this.isHostingStorageEngine(manifest.storageEngineHost)) {
      throw new Error(
        'This datastore needs to be uploaded to the local storage engine host, not a remote one.',
      );
    }
    await client.createRemote(version, previousVersion);
  }

  public async create(
    vm: DatastoreVm,
    datastoreVersion: IDatastoreManifestWithRuntime,
    previousVersion: IDatastoreManifestWithRuntime | null,
    options?: {
      clearExisting?: boolean;
      isWatching?: boolean;
    },
  ): Promise<void> {
    if (!this.isHostingStorageEngine(datastoreVersion.storageEngineHost)) {
      throw new Error(
        `Cannot migrate on this Host. Not the Storage Endpoint (${datastoreVersion.storageEngineHost})`,
      );
    }
    const storagePath = Path.join(this.dataDir, `${datastoreVersion.version}.db`);

    if (options?.clearExisting && env.serverEnvironment !== 'production') {
      await this.deleteExisting(datastoreVersion.id, datastoreVersion.version);
    }

    if (await existsAsync(storagePath)) {
      return;
    }
    const storage = this.get(datastoreVersion, {
      id: datastoreVersion.id,
      version: datastoreVersion.version,
      queryId: 'StorageEngine.create',
    });
    const datastore = await vm.getDatastore(datastoreVersion.runtimePath);
    let previous: Datastore;
    if (previousVersion) {
      previous = await vm.open(
        previousVersion.runtimePath,
        this.get(previousVersion, {
          id: previousVersion.id,
          version: previousVersion.version,
          queryId: 'StorageEngine.create',
        }),
        previousVersion,
      );
    }

    storage.bind(datastore);

    await datastore.bind({ storageEngine: storage });
    await storage.create(datastore, previous);

    if (options?.isWatching) {
      const { id, version, runtimePath } = datastoreVersion;
      let watcher: Fs.FSWatcher;
      const callback = async (): Promise<void> => {
        if (!Fs.existsSync(runtimePath)) {
          if (watcher) watcher.close();
          else Fs.unwatchFile(runtimePath);
        } else {
          await this.deleteExisting(id, version);
          await this.create(vm, datastoreVersion, previousVersion);
        }
      };
      if (process.platform === 'win32' || process.platform === 'darwin') {
        watcher = Fs.watch(runtimePath, { persistent: false }, () => callback());
      } else {
        Fs.watchFile(runtimePath, { persistent: false }, () => callback());
      }
    }
  }

  private onEngineDisconnected(storageHost: string, connection: ConnectionToDatastoreCore): void {
    if (this.#remoteConnectionsByHost.get(storageHost) === connection) {
      this.#remoteConnectionsByHost.delete(storageHost);
    }
  }

  private getRemoteConnection(storageHost: string): ConnectionToDatastoreCore {
    const cleanStorageHost = toUrl(storageHost).host;
    if (!this.#remoteConnectionsByHost.has(cleanStorageHost)) {
      const connection = ConnectionToDatastoreCore.remote(cleanStorageHost);
      connection.once('disconnected', () => this.onEngineDisconnected(storageHost, connection));
      this.#remoteConnectionsByHost.set(cleanStorageHost, connection);
    }
    return this.#remoteConnectionsByHost.get(cleanStorageHost);
  }
}
