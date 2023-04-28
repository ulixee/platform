import { Database as SqliteDatabase, Statement } from 'better-sqlite3';
import SqliteTable from '@ulixee/commons/lib/SqliteTable';

export default class DatastoreItemStatsTable extends SqliteTable<IDatastoreItemStatsRecord> {
  private static byVersionHashAndName: { [hash_name: string]: IDatastoreItemStatsRecord } = {};

  private getQuery: Statement<[string, string]>;

  constructor(db: SqliteDatabase) {
    super(
      db,
      'DatastoreItemStats',
      [
        ['versionHash', 'TEXT', 'NOT NULL PRIMARY KEY'],
        ['name', 'TEXT', 'NOT NULL PRIMARY KEY'],
        ['runs', 'INTEGER'],
        ['errors', 'INTEGER'],
        ['lastRunTimestamp', 'DATETIME'],
        ['averageBytes', 'INTEGER'],
        ['minBytes', 'INTEGER'],
        ['maxBytes', 'INTEGER'],
        ['averageMilliseconds', 'INTEGER'],
        ['maxMilliseconds', 'INTEGER'],
        ['minMilliseconds', 'INTEGER'],
        ['averagePrice', 'INTEGER'],
        ['maxPrice', 'INTEGER'],
        ['minPrice', 'INTEGER'],
        ['totalSpend', 'INTEGER'],
        ['totalCreditSpend', 'INTEGER'],
      ],
      true,
    );
    this.getQuery = db.prepare(
      `select * from ${this.tableName} where versionHash = ? and name = ? limit 1`,
    );
  }

  public record(
    versionHash: string,
    name: string,
    price: number,
    bytes: number,
    milliseconds: number,
    creditsUsed: number,
    isError: boolean,
  ): void {
    price ??= 0;

    const stats = this.getByVersionHash(versionHash, name);
    stats.runs += 1;
    if (isError) stats.errors += 1;
    stats.lastRunTimestamp = Date.now();
    stats.maxPrice = Math.max(stats.maxPrice, price);
    stats.minPrice = Math.min(stats.minPrice, price);
    stats.averagePrice = calculateNewAverage(stats.averagePrice, price, stats.runs);
    stats.maxMilliseconds = Math.max(stats.maxMilliseconds, milliseconds);
    stats.minMilliseconds = Math.min(stats.minMilliseconds, milliseconds);
    stats.averageMilliseconds = calculateNewAverage(
      stats.averageMilliseconds,
      milliseconds,
      stats.runs,
    );
    stats.maxBytes = Math.max(stats.maxBytes, bytes);
    stats.minBytes = Math.min(stats.minBytes, bytes);
    stats.averageBytes = calculateNewAverage(stats.averageBytes, bytes, stats.runs);
    stats.totalSpend += price;
    if (creditsUsed) stats.totalCreditSpend += creditsUsed;

    this.insertNow([
      versionHash,
      name,
      stats.runs,
      stats.errors,
      stats.lastRunTimestamp,
      stats.averageBytes,
      stats.maxBytes,
      stats.minBytes,
      stats.averageMilliseconds,
      stats.maxMilliseconds,
      stats.minMilliseconds,
      stats.averagePrice,
      stats.maxPrice,
      stats.minPrice,
      stats.totalSpend,
      stats.totalCreditSpend,
    ]);
  }

  public getByVersionHash(versionHash: string, name: string): IDatastoreItemStatsRecord {
    DatastoreItemStatsTable.byVersionHashAndName[`${versionHash}_${name}`] ??= (this.getQuery.get(
      versionHash,
      name,
    ) as IDatastoreItemStatsRecord) ?? {
      name,
      lastRunTimestamp: Date.now(),
      runs: 0,
      errors: 0,
      averageBytes: 0,
      maxBytes: 0,
      minBytes: Number.MAX_SAFE_INTEGER,
      averagePrice: 0,
      maxPrice: 0,
      minPrice: Number.MAX_SAFE_INTEGER,
      averageMilliseconds: 0,
      maxMilliseconds: 0,
      minMilliseconds: 0,
      versionHash,
      totalSpend: 0,
      totalCreditSpend: 0,
    };
    return DatastoreItemStatsTable.byVersionHashAndName[`${versionHash}_${name}`];
  }
}

function calculateNewAverage(oldAverage: number, value: number, newTotalValues: number): number {
  if (newTotalValues === 1) return value;
  return Math.round(oldAverage + (value - oldAverage) / newTotalValues);
}

export interface IDatastoreItemStatsRecord {
  versionHash: string;
  name: string;
  runs: number;
  errors: number;
  lastRunTimestamp: number;
  averageBytes: number;
  maxBytes: number;
  minBytes: number;
  averagePrice: number;
  maxPrice: number;
  minPrice: number;
  averageMilliseconds: number;
  maxMilliseconds: number;
  minMilliseconds: number;
  totalSpend: number;
  totalCreditSpend: number;
}
