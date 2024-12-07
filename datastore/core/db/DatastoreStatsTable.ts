import SqliteTable from '@ulixee/commons/lib/SqliteTable';
import { Database as SqliteDatabase, Statement } from 'better-sqlite3';
import { calculateNewAverageBigInt } from './DatastoreEntityStatsTable';

export default class DatastoreStatsTable extends SqliteTable<IDatastoreStatsRecord> {
  private static byVersion: { [datastore_version: string]: IDatastoreStatsRecord } = {};
  private static byDatastore: { [datastore: string]: IDatastoreStatsRecord } = {};

  private getByVersionQuery: Statement<[string, string]>;
  private getQuery: Statement<[string]>;

  constructor(db: SqliteDatabase) {
    super(
      db,
      'DatastoreStats',
      [
        ['datastoreId', 'TEXT', 'NOT NULL PRIMARY KEY'],
        ['version', 'TEXT', 'NOT NULL PRIMARY KEY'],
        ['runs', 'INTEGER'],
        ['errors', 'INTEGER'],
        ['lastRunTimestamp', 'DATETIME'],
        ['averageBytes', 'INTEGER'],
        ['maxBytes', 'INTEGER'],
        ['minBytes', 'INTEGER'],
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
    this.getQuery = db.prepare(`select * from ${this.tableName} where datastoreId = ? limit 1`);
    this.getByVersionQuery = db.prepare(
      `select * from ${this.tableName} where datastoreId = ? and version = ? limit 1`,
    );
  }

  public record(
    datastoreId: string,
    version: string,
    price: bigint,
    bytes: number,
    milliseconds: number,
    creditsUsed: bigint,
    isError: boolean,
  ): { versionStats: IDatastoreStatsRecord; datastoreStats: IDatastoreStatsRecord } {
    price ??= 0n;

    const versionStats = this.getByVersion(datastoreId, version);
    this.addToStats(versionStats, isError, price, milliseconds, bytes, creditsUsed);

    const datastoreStats = this.get(datastoreId);
    this.addToStats(datastoreStats, isError, price, milliseconds, bytes, creditsUsed);

    this.insertNow([
      datastoreId,
      version,
      versionStats.runs,
      versionStats.errors,
      versionStats.lastRunTimestamp,
      versionStats.averageBytes,
      versionStats.maxBytes,
      versionStats.minBytes,
      versionStats.averageMilliseconds,
      versionStats.maxMilliseconds,
      versionStats.minMilliseconds,
      versionStats.averagePrice,
      versionStats.maxPrice,
      versionStats.minPrice,
      versionStats.totalSpend,
      versionStats.totalCreditSpend,
    ]);
    return { datastoreStats, versionStats };
  }

  public getByVersion(datastoreId: string, version: string): IDatastoreStatsRecord {
    DatastoreStatsTable.byVersion[`${datastoreId}_${version}`] ??= this.process(
      this.getByVersionQuery.get(datastoreId, version) ?? this.emptyStats(datastoreId, version),
    );
    return DatastoreStatsTable.byVersion[`${datastoreId}_${version}`];
  }

  public get(datastoreId: string): IDatastoreStatsRecord {
    DatastoreStatsTable.byDatastore[datastoreId] ??= this.process(
      this.getQuery.get(datastoreId) ?? this.emptyStats(datastoreId),
    );
    return DatastoreStatsTable.byDatastore[datastoreId];
  }

  private process(record: IDatastoreStatsRecord): IDatastoreStatsRecord {
    record.averagePrice = BigInt(record.averagePrice);
    record.maxPrice = BigInt(record.maxPrice);
    record.minPrice = BigInt(record.minPrice);
    record.totalSpend = BigInt(record.totalSpend);
    record.totalCreditSpend = BigInt(record.totalCreditSpend);
    return record;
  }

  private emptyStats(datastoreId: string, version?: string): IDatastoreStatsRecord {
    return {
      datastoreId,
      version,
      lastRunTimestamp: Date.now(),
      runs: 0,
      errors: 0,
      averageBytes: 0,
      maxBytes: 0,
      minBytes: Number.MAX_SAFE_INTEGER,
      averagePrice: 0n,
      maxPrice: 0n,
      minPrice: BigInt(Number.MAX_SAFE_INTEGER),
      averageMilliseconds: 0,
      maxMilliseconds: 0,
      minMilliseconds: 0,
      totalSpend: 0n,
      totalCreditSpend: 0n,
    };
  }

  private addToStats(
    stats: IDatastoreStatsRecord,
    isError: boolean,
    price: bigint,
    milliseconds: number,
    bytes: number,
    creditsUsed: bigint,
  ): void {
    stats.runs += 1;
    if (isError) stats.errors += 1;
    stats.lastRunTimestamp = Date.now();
    if (price > stats.maxPrice) stats.maxPrice = price;
    if (price < stats.minPrice) stats.minPrice = price;
    stats.averagePrice = calculateNewAverageBigInt(stats.averagePrice, price, stats.runs);
    stats.maxMilliseconds = Math.max(stats.maxMilliseconds, milliseconds);
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
  }
}

function calculateNewAverage(oldAverage: number, value: number, newTotalValues: number): number {
  if (newTotalValues === 1) return value;
  return Math.round(oldAverage + (value - oldAverage) / newTotalValues);
}

export interface IDatastoreStatsRecord {
  datastoreId: string;
  version: string;
  runs: number;
  errors: number;
  lastRunTimestamp: number;
  averageBytes: number;
  maxBytes: number;
  minBytes: number;
  averagePrice: bigint;
  maxPrice: bigint;
  minPrice: bigint;
  averageMilliseconds: number;
  maxMilliseconds: number;
  minMilliseconds: number;
  totalSpend: bigint;
  totalCreditSpend: bigint;
}
