import { Database as SqliteDatabase } from 'better-sqlite3';
import SqliteTable from '@ulixee/commons/lib/SqliteTable';
export default class DatastoreEntityStatsTable extends SqliteTable<IDatastoreEntityStatsRecord> {
    private static byIdVersionAndName;
    private static byIdAndName;
    private getQuery;
    private getByVersionQuery;
    constructor(db: SqliteDatabase);
    record(datastoreId: string, version: string, name: string, price: number, bytes: number, milliseconds: number, creditsUsed: number, isError: boolean): void;
    getByVersion(datastoreId: string, version: string, name: string): IDatastoreEntityStatsRecord;
    getByDatastore(datastoreId: string, name: string): IDatastoreEntityStatsRecord;
    private emptyStats;
    private addToStats;
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
