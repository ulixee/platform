import { Database as SqliteDatabase } from 'better-sqlite3';
import SqliteTable from '@ulixee/commons/lib/SqliteTable';
import IDataboxManifest from '@ulixee/databox-interfaces/IDataboxManifest';

export default class DataboxesTable extends SqliteTable<IDataboxRecord> {
  public static byHash: { [hash: string]: IDataboxRecord };

  constructor(db: SqliteDatabase) {
    super(
      db,
      'Databoxes',
      [
        ['scriptHash', 'TEXT', 'NOT NULL PRIMARY KEY'],
        ['scriptEntrypoint', 'TEXT'],
        ['runtimeName', 'TEXT'],
        ['runtimeVersion', 'TEXT'],
        ['storedDate', 'DATETIME'],
      ],
      true,
    );
    if (!DataboxesTable.byHash) DataboxesTable.loadCache(this.all());
  }

  public save(manifest: IDataboxManifest): void {
    const storedDate = Date.now();
    this.queuePendingInsert([
      manifest.scriptRollupHash,
      manifest.scriptEntrypoint,
      manifest.runtimeName,
      manifest.runtimeVersion,
      storedDate,
    ]);
    DataboxesTable.byHash[manifest.scriptRollupHash] = {
      scriptHash: manifest.scriptRollupHash,
      scriptEntrypoint: manifest.scriptEntrypoint,
      runtimeName: manifest.runtimeName,
      runtimeVersion: manifest.runtimeVersion,
      storedDate,
    };
  }

  public getByHash(hash: string): IDataboxRecord {
    return DataboxesTable.byHash[hash];
  }

  private static loadCache(records: IDataboxRecord[]): void {
    this.byHash = {};
    for (const record of records) {
      this.byHash[record.scriptHash] = record;
    }
  }
}

export interface IDataboxRecord {
  scriptHash: string;
  scriptEntrypoint: string;
  runtimeName: string;
  runtimeVersion: string;
  storedDate: number;
}
