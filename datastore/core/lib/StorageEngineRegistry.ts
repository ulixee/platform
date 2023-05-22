import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import { toUrl } from '@ulixee/commons/lib/utils';
import Datastore from '@ulixee/datastore/index';
import IStorageEngine from '@ulixee/datastore/interfaces/IStorageEngine';
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
  #storageByVersionHash = new Map<string, IStorageEngine>();

  constructor(dataDir: string, nodeAddress: URL) {
    this.dataDir = Path.join(dataDir, 'storage');
    this.#nodeAddress = nodeAddress;
    if (!Fs.existsSync(this.dataDir)) Fs.mkdirSync(this.dataDir, { recursive: true });
  }

  public async close(): Promise<void> {
    await Promise.allSettled([...this.#storageByVersionHash.values()].map(x => x.close()));
    this.#storageByVersionHash.clear();
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
  ): IStorageEngine {
    const { storageEngineHost, versionHash } = manifest;

    if (this.#storageByVersionHash.has(versionHash)) {
      return this.#storageByVersionHash.get(versionHash);
    }

    let engine: IStorageEngine;
    // if no endpoint, or it's this machine, use file storage
    if (this.isHostingStorageEngine(storageEngineHost)) {
      engine = new SqliteStorageEngine(Path.join(this.dataDir, `${versionHash}.db`));
    } else {
      engine = new RemoteStorageEngine(
        storageEngineHost,
        this.onEngineDisconnected.bind(this, versionHash),
      );
    }
    this.#storageByVersionHash.set(versionHash, engine);
    return engine;
  }

  public async deleteExisting(versionHash: string): Promise<void> {
    const entry = this.#storageByVersionHash.get(versionHash);
    if (!entry) return;
    await entry.close();
    this.#storageByVersionHash.delete(versionHash);
    if (entry instanceof SqliteStorageEngine) {
      await Fs.promises.rm(entry.path).catch(() => null);
    }
  }

  public async createRemote(
    manifest: IDatastoreManifest,
    version: IDatastoreApiTypes['Datastore.upload']['args'],
    previousVersion: IDatastoreApiTypes['Datastore.upload']['args'],
  ): Promise<void> {
    const client = this.get(manifest) as RemoteStorageEngine;
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
    const storage = this.get(version);
    const datastore = await vm.getDatastore(version.runtimePath);
    let previous: Datastore;
    if (previousVersion) {
      previous = await vm.open(
        previousVersion.runtimePath,
        this.get(previousVersion),
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

  private onEngineDisconnected(versionHash: string, engine: RemoteStorageEngine): void {
    if (this.#storageByVersionHash[versionHash] === engine) {
      delete this.#storageByVersionHash[versionHash];
    }
  }
}
