/// <reference types="node" />
import SqliteTable from '@ulixee/commons/lib/SqliteTable';
import { Database as SqliteDatabase } from 'better-sqlite3';
import { IKadRecord } from '../lib/KadRecord';
export default class RecordsTable extends SqliteTable<IKadRecievedRecord> {
    static MAX_RECORD_AGE: number;
    constructor(db: SqliteDatabase);
    put(key: Buffer, record: IKadRecord, isOwnRecord: boolean): void;
    get(key: Buffer): IKadRecievedRecord;
    delete(key: Buffer): void;
    getIfNotExpired(key: Buffer): IKadRecievedRecord;
}
export interface IKadRecievedRecord extends IKadRecord {
    key: Buffer;
    receivedTimestamp: number;
    isOwnRecord: boolean;
}
