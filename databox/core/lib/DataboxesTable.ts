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
        ['coreVersion', 'TEXT'],
        ['giftCardIssuerIdentity', 'TEXT'],
        ['schemaInterface', 'TEXT'],
        ['functionsByName', 'TEXT'],
        ['scriptHash', 'TEXT'],
        ['scriptEntrypoint', 'TEXT'],
        ['storedDate', 'DATETIME'],
      ],
      true,
    );
    this.getQuery = db.prepare(`select * from ${this.tableName} where versionHash = ? limit 1`);
  }

  public save(manifest: IDataboxManifest): void {
    const storedDate = Date.now();
    const functionsByName: IDataboxRecord['functionsByName'] = {};
    for (const [name, func] of Object.entries(manifest.functionsByName)) {
      functionsByName[name] = {
        name,
        pricePerQuery: func.pricePerQuery ?? 0,
        corePlugins: func.corePlugins ?? {},
      };
    }
    this.insertNow([
      manifest.versionHash,
      manifest.versionTimestamp,
      manifest.paymentAddress,
      manifest.coreVersion,
      manifest.giftCardIssuerIdentity,
      manifest.schemaInterface,
      JSON.stringify(functionsByName),
      manifest.scriptHash,
      manifest.scriptEntrypoint,
      storedDate,
    ]);

    DataboxesTable.byVersionHash[manifest.versionHash] = {
      versionHash: manifest.versionHash,
      versionTimestamp: manifest.versionTimestamp,
      paymentAddress: manifest.paymentAddress,
      schemaInterface: manifest.schemaInterface,
      giftCardIssuerIdentity: manifest.giftCardIssuerIdentity,
      coreVersion: manifest.coreVersion,
      functionsByName,
      scriptHash: manifest.scriptHash,
      scriptEntrypoint: manifest.scriptEntrypoint,
      storedDate,
    };
  }

  public findWithEntrypoint(entrypoint: string): IDataboxRecord {
    const query = this.db.prepare(
      `select * from ${this.tableName} where scriptEntrypoint = ? limit 1`,
    );
    const record = query.get(entrypoint);
    if (!record) return;
    record.functionsByName = JSON.parse(record.functionsByName);
    return record;
  }

  public getByVersionHash(versionHash: string): IDataboxRecord {
    if (!DataboxesTable.byVersionHash[versionHash]) {
      const record = this.getQuery.get(versionHash);
      if (!record) return;
      record.functionsByName = JSON.parse(record.functionsByName);
      DataboxesTable.byVersionHash[versionHash] = record;
    }
    return DataboxesTable.byVersionHash[versionHash];
  }
}

export interface IDataboxRecord {
  versionHash: string;
  versionTimestamp: number;
  coreVersion: string;
  schemaInterface: string;
  functionsByName: {
    [name: string]: {
      name: string;
      pricePerQuery: number;
      corePlugins: { [name: string]: string };
    };
  };
  paymentAddress: string;
  giftCardIssuerIdentity: string;
  scriptHash: string;
  scriptEntrypoint: string;
  storedDate: number;
}
