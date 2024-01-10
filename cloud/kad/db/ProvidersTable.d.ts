/// <reference types="node" />
import SqliteTable from '@ulixee/commons/lib/SqliteTable';
import { Database as SqliteDatabase } from 'better-sqlite3';
export default class ProvidersTable extends SqliteTable<IProvidersRecord> {
    constructor(db: SqliteDatabase);
    record(record: IProvidersRecord): void;
    updateExpiration(providerNodeId: string, key: Buffer, timestamp: number): void;
    getWithKey(key: Buffer): IProvidersRecord[];
    delete(providerNodeId: string, key: Buffer): void;
}
export interface IProvidersRecord {
    providerNodeId: string;
    key: Buffer;
    publishedTimestamp: number;
    expirationTimestamp: number;
}
