import { Database as SqliteDatabase, Statement } from 'better-sqlite3';
import SqliteTable from '@ulixee/commons/lib/SqliteTable';
import IDataboxManifest from '@ulixee/specification/types/IDataboxManifest';

export default class DataboxesTable extends SqliteTable<IDataboxRecord> {
  private static byVersionHash: { [hash: string]: IDataboxRecord } = {};

  private getQuery: Statement<string>;

  constructor(db: SqliteDatabase) {
    super(
      db,
      'Databoxes',
      [
        ['versionHash', 'TEXT', 'NOT NULL PRIMARY KEY'],
        ['versionTimestamp', 'DATETIME'],
        ['paymentAddress', 'TEXT'],
        ['creditsAddress', 'TEXT'],
        ['pricePerQuery', 'INTEGER'],
        ['scriptHash', 'TEXT'],
        ['scriptEntrypoint', 'TEXT'],
        ['runtimeName', 'TEXT'],
        ['runtimeVersion', 'TEXT'],
        ['storedDate', 'DATETIME'],
      ],
      true,
    );
    this.getQuery = db.prepare(`select * from ${this.tableName} where versionHash = ? limit 1`);
  }

  public save(manifest: IDataboxManifest): void {
    manifest.pricePerQuery ??= 0;
    const storedDate = Date.now();
    this.insertNow([
      manifest.versionHash,
      manifest.versionTimestamp,
      manifest.paymentAddress,
      manifest.creditsAddress,
      manifest.pricePerQuery,
      manifest.scriptHash,
      manifest.scriptEntrypoint,
      manifest.runtimeName,
      manifest.runtimeVersion,
      storedDate,
    ]);

    DataboxesTable.byVersionHash[manifest.versionHash] = {
      versionHash: manifest.versionHash,
      versionTimestamp: manifest.versionTimestamp,
      paymentAddress: manifest.paymentAddress,
      creditsAddress: manifest.creditsAddress,
      pricePerQuery: manifest.pricePerQuery,
      scriptHash: manifest.scriptHash,
      scriptEntrypoint: manifest.scriptEntrypoint,
      runtimeName: manifest.runtimeName,
      runtimeVersion: manifest.runtimeVersion,
      storedDate,
    };
  }

  public findWithEntrypoint(entrypoint: string): IDataboxRecord {
    const query = this.db.prepare(
      `select * from ${this.tableName} where scriptEntrypoint = ? limit 1`,
    );
    return query.get(entrypoint);
  }

  public getByVersionHash(versionHash: string): IDataboxRecord {
    DataboxesTable.byVersionHash[versionHash] ??= this.getQuery.get(versionHash);
    return DataboxesTable.byVersionHash[versionHash];
  }
}

export interface IDataboxRecord {
  versionHash: string;
  versionTimestamp: number;
  pricePerQuery: number;
  paymentAddress: string;
  creditsAddress: string;
  scriptHash: string;
  scriptEntrypoint: string;
  runtimeName: string;
  runtimeVersion: string;
  storedDate: number;
}
