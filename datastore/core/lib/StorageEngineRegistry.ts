import * as Path from 'path';
import Datastore from '@ulixee/datastore/index';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import IStorageEngine from '@ulixee/datastore/interfaces/IStorageEngine';
import * as Fs from 'fs';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import SqliteStorageEngine from '@ulixee/datastore/storage-engines/SqliteStorageEngine';
import RemoteStorageEngine from '@ulixee/datastore/storage-engines/RemoteStorageEngine';
import DatastoreVm from './DatastoreVm';

export default class StorageEngineRegistry {
  public readonly dataDir: string;

  #storageApiClientsByAddress: { [address: string]: DatastoreApiClient } = {};
  #nodeAddress: URL;
  #storageByVersionHash = new Map<string, IStorageEngine>();

  constructor(dataDir: string, nodeAddress: URL) {
    this.dataDir = Path.join(dataDir, 'storage');
    this.#nodeAddress = nodeAddress;
    if (!Fs.existsSync(this.dataDir)) Fs.mkdirSync(this.dataDir, { recursive: true });
  }

  public async close(): Promise<void> {
    await Promise.allSettled([...this.#storageByVersionHash.values()].map(x => x.close()));
    await Promise.allSettled(
      [...Object.values(this.#storageApiClientsByAddress)].map(x => x.disconnect()),
    );
    this.#storageApiClientsByAddress = {};
    this.#storageByVersionHash.clear();
  }

  public isHostingStorageEndpoint(storageEngineEndpoint: string): boolean {
    if (storageEngineEndpoint) {
      const engineUrl = new URL(storageEngineEndpoint);
      engineUrl.protocol ??= 'ws:';
      return engineUrl.host === this.#nodeAddress.host;
    }
    return true;
  }

  public get(
    manifest: Pick<IDatastoreManifest, 'versionHash' | 'storageEngineEndpoint'>,
  ): IStorageEngine {
    const { storageEngineEndpoint, versionHash } = manifest;

    if (this.#storageByVersionHash.has(versionHash)) {
      return this.#storageByVersionHash.get(versionHash);
    }

    let engine: IStorageEngine;
    // if no endpoint, or it's this machine, use file storage
    if (this.isHostingStorageEndpoint(storageEngineEndpoint)) {
      engine = new SqliteStorageEngine(Path.join(this.dataDir, `${versionHash}.db`));
    } else {
      engine = new RemoteStorageEngine(storageEngineEndpoint);
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

  public async create(
    vm: DatastoreVm,
    dbxPath: string,
    manifest: IDatastoreManifest,
    previousVersion: { manifest: IDatastoreManifest; dbxPath: string },
    watch?: boolean,
  ): Promise<void> {
    if (!this.isHostingStorageEndpoint(manifest.storageEngineEndpoint)) {
      throw new Error(
        `Cannot migrate on this Host. Not the Storage Endpoint (${manifest.storageEngineEndpoint})`,
      );
    }
    const storagePath = Path.join(this.dataDir, `${manifest.versionHash}.db`);
    if (await existsAsync(storagePath)) {
      return;
    }
    const storage = this.get(manifest);
    const datastore = await vm.getDatastore(Path.join(dbxPath, 'datastore.js'));
    let previous: Datastore;
    if (previousVersion) {
      previous = await vm.open(
        Path.join(previousVersion.dbxPath, 'datastore.js'),
        this.get(previousVersion.manifest),
        previousVersion.manifest,
      );
    }

    storage.bind(datastore);

    await datastore.bind({ storageEngine: storage });
    await storage.create(datastore, previous);

    if (watch) {
      let watcher: Fs.FSWatcher;
      const callback = async (): Promise<void> => {
        if (!Fs.existsSync(dbxPath)) {
          if (watcher) watcher.close();
          else Fs.unwatchFile(dbxPath);
        } else {
          await this.deleteExisting(versionHash);
          await this.create(vm, dbxPath, manifest, previousVersion);
        }
      };
      const versionHash = manifest.versionHash;
      if (process.platform === 'win32' || process.platform === 'darwin') {
        watcher = Fs.watch(dbxPath, { persistent: false }, () => callback());
      } else {
        Fs.watchFile(dbxPath, { persistent: false }, () => callback());
      }
    }
  }
}
