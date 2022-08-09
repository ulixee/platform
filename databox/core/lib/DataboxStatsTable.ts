import { Database as SqliteDatabase, Statement } from 'better-sqlite3';
import SqliteTable from '@ulixee/commons/lib/SqliteTable';

export default class DataboxStatsTable extends SqliteTable<IDataboxStatsRecord> {
  private static byVersionHash: { [hash: string]: IDataboxStatsRecord } = {};

  private getQuery: Statement<string>;

  constructor(db: SqliteDatabase) {
    super(
      db,
      'DataboxStats',
      [
        ['versionHash', 'TEXT', 'NOT NULL PRIMARY KEY'],
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
    this.getQuery = db.prepare(`select * from ${this.tableName} where versionHash = ? limit 1`);
  }

  public record(versionHash: string, price: number, bytes: number, milliseconds: number): void {
    price ??=0;

    const stats = this.getByVersionHash(versionHash);
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
    this.queuePendingInsert([versionHash]);
  }

  public getByVersionHash(versionHash: string): IDataboxStatsRecord {
    DataboxStatsTable.byVersionHash[versionHash] ??= this.getQuery.get(versionHash) ?? {
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
    return DataboxStatsTable.byVersionHash[versionHash];
  }
}

function calculateNewAverage(oldAverage: number, value: number, newTotalValues: number): number {
  if (newTotalValues === 1) return value;
  return Math.round(oldAverage + (value - oldAverage) / newTotalValues);
}

export interface IDataboxStatsRecord {
  versionHash: string;
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
