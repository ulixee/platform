import { Database as SqliteDatabase, Statement } from 'better-sqlite3';
import SqliteTable from '@ulixee/commons/lib/SqliteTable';
import IDataboxManifest from '@ulixee/databox-interfaces/IDataboxManifest';

export default class DataboxesTable extends SqliteTable<IDataboxRecord> {
  public static byHash: { [hash: string]: IDataboxRecord } = {};

  private getQuery: Statement<string>;

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
    this.getQuery = db.prepare(`select * from ${this.tableName} where scriptHash = ? limit 1`);
  }

  public save(manifest: IDataboxManifest): void {
    const storedDate = Date.now();
    this.insertNow([
      manifest.scriptVersionHash,
      manifest.scriptEntrypoint,
      manifest.runtimeName,
      manifest.runtimeVersion,
      storedDate,
    ]);

    DataboxesTable.byHash[manifest.scriptVersionHash] = {
      scriptHash: manifest.scriptVersionHash,
      scriptEntrypoint: manifest.scriptEntrypoint,
      runtimeName: manifest.runtimeName,
      runtimeVersion: manifest.runtimeVersion,
      storedDate,
    };
  }

  public getByHash(hash: string): IDataboxRecord {
    if (!DataboxesTable.byHash[hash]) {
      DataboxesTable.byHash[hash] = this.getQuery.get(hash);
    }
    return DataboxesTable.byHash[hash];
  }
}

export interface IDataboxRecord {
  scriptHash: string;
  scriptEntrypoint: string;
  runtimeName: string;
  runtimeVersion: string;
  storedDate: number;
}
