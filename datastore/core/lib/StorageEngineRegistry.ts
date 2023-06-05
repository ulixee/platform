import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import { toUrl } from '@ulixee/commons/lib/utils';
import Datastore, { ConnectionToDatastoreCore } from '@ulixee/datastore';
import IStorageEngine, { TQueryCallMeta } from '@ulixee/datastore/interfaces/IStorageEngine';
import RemoteStorageEngine from '@ulixee/datastore/storage-engines/RemoteStorageEngine';
import SqliteStorageEngine from '@ulixee/datastore/storage-engines/SqliteStorageEngine';
import IDatastoreApiTypes from '@ulixee/platform-specification/datastore/DatastoreApis';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import * as Fs from 'fs';
import * as Path from 'path';
import env from '../env';
import { IDatastoreManifestWithRuntime } from './DatastoreRegistry';
import DatastoreVm from './DatastoreVm';

export default class StorageEngineRegistry {
  public readonly dataDir: string;

  #nodeAddress: URL;
  #localStorageByVersionHash = new Map<string, IStorageEngine>();
  #remoteConnectionsByHost = new Map<string, ConnectionToDatastoreCore>();

  constructor(dataDir: string, nodeAddress: URL) {
    this.dataDir = Path.join(dataDir, 'storage');
    this.#nodeAddress = nodeAddress;
    if (!Fs.existsSync(this.dataDir)) Fs.mkdirSync(this.dataDir, { recursive: true });
  }

  public async close(): Promise<void> {
    await Promise.allSettled([...this.#localStorageByVersionHash.values()].map(x => x.close()));
    await Promise.allSettled([...this.#remoteConnectionsByHost.values()].map(x => x.disconnect()));
    this.#localStorageByVersionHash.clear();
  }

  public isHostingStorageEngine(storageEngineHost: string): boolean {
    if (storageEngineHost) {
      const engineUrl = toUrl(storageEngineHost);
      return engineUrl.host === this.#nodeAddress.host;
    }
    return true;
  }

  public get(
    manifest: Pick<IDatastoreManifest, 'versionHash' | 'storageEngineHost'>,
    queryMetadata: TQueryCallMeta,
  ): IStorageEngine {
    const { storageEngineHost, versionHash } = manifest;

    if (this.#localStorageByVersionHash.has(versionHash)) {
      return this.#localStorageByVersionHash.get(versionHash);
    }

    let engine: IStorageEngine;
    // if no endpoint, or it's this machine, use file storage
    if (this.isHostingStorageEngine(storageEngineHost)) {
      engine = new SqliteStorageEngine(Path.join(this.dataDir, `${versionHash}.db`));
      this.#localStorageByVersionHash.set(versionHash, engine);
    } else {
      const connection = this.getRemoteConnection(storageEngineHost);
      engine = new RemoteStorageEngine(connection, queryMetadata);
    }
    return engine;
  }

  public async deleteExisting(versionHash: string): Promise<void> {
    const entry = this.#localStorageByVersionHash.get(versionHash);
    if (!entry) return;
    await entry.close();
    this.#localStorageByVersionHash.delete(versionHash);
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
      versionHash: manifest.versionHash,
      id: 'StorageEngine.createRemote',
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
    version: IDatastoreManifestWithRuntime,
    previousVersion: IDatastoreManifestWithRuntime | null,
    options?: {
      clearExisting?: boolean;
      isWatching?: boolean;
    },
  ): Promise<void> {
    if (!this.isHostingStorageEngine(version.storageEngineHost)) {
      throw new Error(
        `Cannot migrate on this Host. Not the Storage Endpoint (${version.storageEngineHost})`,
      );
    }
    const storagePath = Path.join(this.dataDir, `${version.versionHash}.db`);

    if (options?.clearExisting && env.serverEnvironment !== 'production') {
      await this.deleteExisting(version.versionHash);
    }

    if (await existsAsync(storagePath)) {
      return;
    }
    const storage = this.get(version, {
      versionHash: version.versionHash,
      id: 'StorageEngine.create',
    });
    const datastore = await vm.getDatastore(version.runtimePath);
    let previous: Datastore;
    if (previousVersion) {
      previous = await vm.open(
        previousVersion.runtimePath,
        this.get(previousVersion, {
          versionHash: previousVersion.versionHash,
          id: 'StorageEngine.create',
        }),
        previousVersion,
      );
    }

    storage.bind(datastore);

    await datastore.bind({ storageEngine: storage });
    await storage.create(datastore, previous);

    if (options?.isWatching) {
      const runtimePath = version.runtimePath;
      const versionHash = version.versionHash;
      let watcher: Fs.FSWatcher;
      const callback = async (): Promise<void> => {
        if (!Fs.existsSync(runtimePath)) {
          if (watcher) watcher.close();
          else Fs.unwatchFile(runtimePath);
        } else {
          await this.deleteExisting(versionHash);
          await this.create(vm, version, previousVersion);
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
