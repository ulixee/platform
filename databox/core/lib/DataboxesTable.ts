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
        ['giftCardAddress', 'TEXT'],
        ['pricePerQuery', 'INTEGER'],
        ['scriptHash', 'TEXT'],
        ['scriptEntrypoint', 'TEXT'],
        ['coreVersion', 'TEXT'],
        ['corePlugins', 'TEXT'],
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
      manifest.giftCardAddress,
      manifest.pricePerQuery,
      manifest.scriptHash,
      manifest.scriptEntrypoint,
      manifest.coreVersion,
      JSON.stringify(manifest.corePlugins),
      storedDate,
    ]);

    DataboxesTable.byVersionHash[manifest.versionHash] = {
      versionHash: manifest.versionHash,
      versionTimestamp: manifest.versionTimestamp,
      paymentAddress: manifest.paymentAddress,
      giftCardAddress: manifest.giftCardAddress,
      pricePerQuery: manifest.pricePerQuery,
      scriptHash: manifest.scriptHash,
      scriptEntrypoint: manifest.scriptEntrypoint,
      coreVersion: manifest.coreVersion,
      corePlugins: manifest.corePlugins,
      storedDate,
    };
  }

  public findWithEntrypoint(entrypoint: string): IDataboxRecord {
    const query = this.db.prepare(
      `select * from ${this.tableName} where scriptEntrypoint = ? limit 1`,
    );
    const record = query.get(entrypoint);
    if (!record) return;
    record.corePlugins = JSON.parse(record.corePlugins);
    return record;
  }

  public getByVersionHash(versionHash: string): IDataboxRecord {
    if (!DataboxesTable.byVersionHash[versionHash]) {
      const record = this.getQuery.get(versionHash);
      if (!record) return;
      record.corePlugins = JSON.parse(record.corePlugins);
      DataboxesTable.byVersionHash[versionHash] = record;
    }
    return DataboxesTable.byVersionHash[versionHash];
  }
}

export interface IDataboxRecord {
  versionHash: string;
  versionTimestamp: number;
  pricePerQuery: number;
  paymentAddress: string;
  giftCardAddress: string;
  scriptHash: string;
  scriptEntrypoint: string;
  coreVersion: string;
  corePlugins: { [name: string]: string };
  storedDate: number;
}
