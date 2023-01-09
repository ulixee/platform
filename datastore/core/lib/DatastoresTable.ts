import { Database as SqliteDatabase, Statement } from 'better-sqlite3';
import SqliteTable from '@ulixee/commons/lib/SqliteTable';
import IDatastoreManifest from '@ulixee/specification/types/IDatastoreManifest';

export default class DatastoresTable extends SqliteTable<IDatastoreRecord> {
  private static byVersionHash: { [hash: string]: IDatastoreRecord } = {};

  private getQuery: Statement<string>;

  constructor(db: SqliteDatabase) {
    super(
      db,
      'Datastores',
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

  public save(manifest: IDatastoreManifest): void {
    const storedDate = Date.now();
    const functionsByName: IDatastoreRecord['functionsByName'] = {};
    for (const [name, func] of Object.entries(manifest.functionsByName)) {
      const prices: IDatastoreRecord['functionsByName'][0]['prices'] = (func.prices ?? []) as any;
      if (prices.length === 0) prices.push({ perQuery: 0 } as any);
      for (const price of prices) {
        price.perQuery ??= 0;
        price.minimum ??= price.perQuery;
        price.addOns ??= { perKb: 0 };
      }
      functionsByName[name] = {
        corePlugins: func.corePlugins ?? {},
        prices,
        schemaAsJson: func.schemaAsJson,
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

    DatastoresTable.byVersionHash[manifest.versionHash] = {
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

  public findWithEntrypoint(entrypoint: string): IDatastoreRecord {
    const query = this.db.prepare(
      `select * from ${this.tableName} where scriptEntrypoint = ? limit 1`,
    );
    const record = query.get(entrypoint);
    if (!record) return;
    record.functionsByName = JSON.parse(record.functionsByName);
    return record;
  }

  public getByVersionHash(versionHash: string): IDatastoreRecord {
    if (!DatastoresTable.byVersionHash[versionHash]) {
      const record = this.getQuery.get(versionHash);
      if (!record) return;
      record.functionsByName = JSON.parse(record.functionsByName);
      DatastoresTable.byVersionHash[versionHash] = record;
    }
    return DatastoresTable.byVersionHash[versionHash];
  }
}

export interface IDatastoreRecord {
  versionHash: string;
  versionTimestamp: number;
  coreVersion: string;
  schemaInterface: string;
  functionsByName: {
    [name: string]: {
      corePlugins: Record<string, string>;
      schemaAsJson: any;
      prices: {
        perQuery: number;
        minimum: number;
        addOns: {
          perKb: number;
        };
        remoteMeta?: {
          host: string;
          datastoreVersionHash: string;
          functionName: string;
        };
      }[];
    };
  };
  paymentAddress: string;
  giftCardIssuerIdentity: string;
  scriptHash: string;
  scriptEntrypoint: string;
  storedDate: number;
}
