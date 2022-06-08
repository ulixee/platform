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
        ['id', 'TEXT', 'NOT NULL PRIMARY KEY'],
        ['scriptHash', 'TEXT'],
        ['scriptEntrypoint', 'TEXT'],
        ['module', 'TEXT'],
        ['moduleVersion', 'TEXT'],
        ['storedDate', 'DATETIME'],
      ],
      true,
    );
    if (!DataboxesTable.byHash) DataboxesTable.loadCache(this.all());
  }

  public save(id: string, manifest: IDataboxManifest): void {
    const storedDate = Date.now();
    this.queuePendingInsert([
      id,
      manifest.scriptRollupHash,
      manifest.scriptEntrypoint,
      manifest.databoxModule,
      manifest.databoxModuleVersion,
      storedDate,
    ]);
    DataboxesTable.byHash[manifest.scriptRollupHash] = {
      id,
      scriptHash: manifest.scriptRollupHash,
      scriptEntrypoint: manifest.scriptEntrypoint,
      module: manifest.databoxModule,
      moduleVersion: manifest.databoxModuleVersion,
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
  id: string;
  scriptHash: string;
  scriptEntrypoint: string;
  module: string;
  moduleVersion: string;
  storedDate: number;
}
