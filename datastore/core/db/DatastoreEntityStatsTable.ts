import { Database as SqliteDatabase, Statement } from 'better-sqlite3';
import SqliteTable from '@ulixee/commons/lib/SqliteTable';

export default class DatastoreEntityStatsTable extends SqliteTable<IDatastoreEntityStatsRecord> {
  private static byIdVersionAndName: { [id_version_name: string]: IDatastoreEntityStatsRecord } =
    {};

  private static byIdAndName: { [id_name: string]: IDatastoreEntityStatsRecord } = {};

  private getQuery: Statement<[string, string]>;
  private getByVersionQuery: Statement<[string, string, string]>;

  constructor(db: SqliteDatabase) {
    super(
      db,
      'DatastoreEntityStats',
      [
        ['datastoreId', 'TEXT', 'NOT NULL PRIMARY KEY'],
        ['version', 'TEXT', 'NOT NULL PRIMARY KEY'],
        ['name', 'TEXT', 'NOT NULL PRIMARY KEY'],
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
    this.getByVersionQuery = db.prepare(
      `select * from ${this.tableName} where datastoreId = ? and version = ? and name = ? limit 1`,
    );
    this.getQuery = db.prepare(
      `select * from ${this.tableName} where datastoreId = ? and name = ? limit 1`,
    );
  }

  public record(
    datastoreId: string,
    version: string,
    name: string,
    price: number,
    bytes: number,
    milliseconds: number,
    creditsUsed: number,
    isError: boolean,
  ): void {
    const microgons = Number(price) ?? 0;

    const stats = this.getByVersion(datastoreId, version, name);
    this.addToStats(stats, isError, microgons, milliseconds, bytes, creditsUsed);
    const datastoreStats = this.getByDatastore(datastoreId, name);
    this.addToStats(datastoreStats, isError, microgons, milliseconds, bytes, creditsUsed);

    this.insertNow([
      datastoreId,
      version,
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

  public getByVersion(
    datastoreId: string,
    version: string,
    name: string,
  ): IDatastoreEntityStatsRecord {
    DatastoreEntityStatsTable.byIdVersionAndName[`${datastoreId}_${version}_${name}`] ??=
      (this.getByVersionQuery.get(datastoreId, version, name) as IDatastoreEntityStatsRecord) ??
      this.emptyStats(name, datastoreId, version);
    return DatastoreEntityStatsTable.byIdVersionAndName[`${datastoreId}_${version}_${name}`];
  }

  public getByDatastore(datastoreId: string, name: string): IDatastoreEntityStatsRecord {
    DatastoreEntityStatsTable.byIdAndName[`${datastoreId}_${name}`] ??=
      (this.getQuery.get(datastoreId, name) as IDatastoreEntityStatsRecord) ??
      this.emptyStats(name, datastoreId);
    return DatastoreEntityStatsTable.byIdAndName[`${datastoreId}_${name}`];
  }

  private emptyStats(
    name: string,
    datastoreId: string,
    version?: string,
  ): IDatastoreEntityStatsRecord {
    return {
      name,
      datastoreId,
      version,
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
      totalSpend: 0,
      totalCreditSpend: 0,
    };
  }

  private addToStats(
    stats: IDatastoreEntityStatsRecord,
    isError: boolean,
    price: number,
    milliseconds: number,
    bytes: number,
    creditsUsed: number,
  ): void {
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
  }
}

function calculateNewAverage(oldAverage: number, value: number, newTotalValues: number): number {
  if (newTotalValues === 1) return value;
  return Math.round(oldAverage + (value - oldAverage) / newTotalValues);
}

export interface IDatastoreEntityStatsRecord {
  datastoreId: string;
  version: string;
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
