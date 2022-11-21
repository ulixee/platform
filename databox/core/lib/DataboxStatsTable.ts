import { Database as SqliteDatabase, Statement } from 'better-sqlite3';
import SqliteTable from '@ulixee/commons/lib/SqliteTable';

export default class DataboxStatsTable extends SqliteTable<IDataboxStatsRecord> {
  private static byVersionHashAndName: { [hash_functionName: string]: IDataboxStatsRecord } = {};

  private getQuery: Statement<[string, string]>;

  constructor(db: SqliteDatabase) {
    super(
      db,
      'DataboxStats',
      [
        ['versionHash', 'TEXT', 'NOT NULL PRIMARY KEY'],
        ['functionName', 'TEXT', 'NOT NULL PRIMARY KEY'],
        ['lastRunTimestamp', 'DATETIME'],
        ['averageBytes', 'INTEGER'],
        ['minBytes', 'INTEGER'],
        ['maxBytes', 'INTEGER'],
        ['averageMilliseconds', 'INTEGER'],
        ['maxMilliseconds', 'INTEGER'],
        ['averagePrice', 'INTEGER'],
        ['minPrice', 'INTEGER'],
        ['maxPrice', 'INTEGER'],
      ],
      true,
    );
    this.getQuery = db.prepare(
      `select * from ${this.tableName} where versionHash = ? and functionName = ? limit 1`,
    );
  }

  public record(
    versionHash: string,
    functionName: string,
    price: number,
    bytes: number,
    milliseconds: number,
  ): void {
    price ??= 0;

    const stats = this.getByVersionHash(versionHash, functionName);
    stats.runs += 1;
    stats.lastRunTimestamp = Date.now();
    stats.maxPrice = Math.max(stats.maxPrice, price);
    stats.minPrice = Math.min(stats.minPrice, price);
    stats.averagePrice = calculateNewAverage(stats.averagePrice, price, stats.runs);
    stats.maxMilliseconds = Math.max(stats.maxMilliseconds, milliseconds);
    stats.averageMilliseconds = calculateNewAverage(
      stats.averageMilliseconds,
      milliseconds,
      stats.runs,
    );
    stats.maxBytes = Math.max(stats.maxBytes, bytes);
    stats.minBytes = Math.min(stats.minBytes, bytes);
    stats.averageBytes = calculateNewAverage(stats.averageBytes, bytes, stats.runs);
    this.queuePendingInsert([
      versionHash,
      functionName,
      stats.runs,
      stats.lastRunTimestamp,
      stats.averageBytes,
      stats.maxBytes,
      stats.minBytes,
      stats.minPrice,
      stats.averageBytes,
      stats.maxPrice,
      stats.averageMilliseconds,
      stats.maxMilliseconds,
    ]);
  }

  public getByVersionHash(versionHash: string, functionName: string): IDataboxStatsRecord {
    DataboxStatsTable.byVersionHashAndName[`${versionHash}_${functionName}`] ??= this.getQuery.get(
      versionHash,
      functionName,
    ) ?? {
      lastRunTimestamp: Date.now(),
      runs: 0,
      averageBytes: 0,
      maxBytes: 0,
      minBytes: Number.MAX_SAFE_INTEGER,
      averagePrice: 0,
      maxPrice: 0,
      minPrice: Number.MAX_SAFE_INTEGER,
      averageMilliseconds: 0,
      maxMilliseconds: 0,
      versionHash,
    };
    return DataboxStatsTable.byVersionHashAndName[`${versionHash}_${functionName}`];
  }
}

function calculateNewAverage(oldAverage: number, value: number, newTotalValues: number): number {
  if (newTotalValues === 1) return value;
  return Math.round(oldAverage + (value - oldAverage) / newTotalValues);
}

export interface IDataboxStatsRecord {
  versionHash: string;
  functionName: string;
  runs: number;
  lastRunTimestamp: number;
  averageBytes: number;
  maxBytes: number;
  minBytes: number;
  minPrice: number;
  averagePrice: number;
  maxPrice: number;
  averageMilliseconds: number;
  maxMilliseconds: number;
}
