import * as Path from 'path';
import Datastore from '@ulixee/datastore/index';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import StorageEngine from '@ulixee/datastore/lib/StorageEngine';
import LocalSqliteConnection from '@ulixee/datastore/sql-connections/LocalSqliteConnection';
import * as Fs from 'fs';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import DatastoreVm from './DatastoreVm';

export default class StorageEngineRegistry {
  public readonly dataDir: string;

  #storageByPath = new Map<string, StorageEngine>();

  constructor(dataDir: string) {
    this.dataDir = Path.join(dataDir, 'storage');
    if (!Fs.existsSync(this.dataDir)) Fs.mkdirSync(this.dataDir, { recursive: true });
  }

  public async close(): Promise<void> {
    for (const storage of this.#storageByPath.values()) {
      await storage.close();
    }
    this.#storageByPath.clear();
  }

  public get(versionHash: string): StorageEngine {
    const storagePath = Path.join(this.dataDir, `${versionHash}.db`);
    if (this.#storageByPath.has(storagePath)) return this.#storageByPath.get(storagePath);

    const connection = new LocalSqliteConnection(storagePath);
    const storage = new StorageEngine(connection);
    this.#storageByPath.set(storagePath, storage);
    return storage;
  }

  public async deleteExisting(versionHash: string): Promise<void> {
    const storagePath = Path.join(this.dataDir, `${versionHash}.db`);
    await this.#storageByPath.get(storagePath)?.close();
    this.#storageByPath.delete(storagePath);
    if (await existsAsync(storagePath)) {
      await Fs.promises.rm(storagePath);
    }
  }

  public async create(
    dbxPath: string,
    manifest: IDatastoreManifest,
    previousVersion: { manifest: IDatastoreManifest; dbxPath: string },
    watch?: boolean,
  ): Promise<void> {
    const storagePath = Path.join(this.dataDir, `${manifest.versionHash}.db`);
    if (await existsAsync(storagePath)) {
      return;
    }
    const storage = this.get(manifest.versionHash);
    const datastore = await DatastoreVm.getDatastore(Path.join(dbxPath, 'datastore.js'));
    let previous: Datastore;
    if (previousVersion) {
      previous = await DatastoreVm.open(
        Path.join(previousVersion.dbxPath, 'datastore.js'),
        this.get(previousVersion.manifest.versionHash),
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
          await this.create(dbxPath, manifest, previousVersion);
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
