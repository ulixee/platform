import SqliteTable from '@ulixee/commons/lib/SqliteTable';
import { Database as SqliteDatabase } from 'better-sqlite3';
import { IKadRecord } from '../lib/KadRecord';

export default class RecordsTable extends SqliteTable<IKadRecievedRecord> {
  public static MAX_RECORD_AGE = 36 * 60e3;
  constructor(db: SqliteDatabase) {
    super(
      db as any,
      'Records',
      [
        ['key', 'BLOB', 'NOT NULL PRIMARY KEY'],
        ['publicKey', 'BLOB', 'NOT NULL'],
        ['value', 'TEXT', 'NOT NULL'],
        ['timestamp', 'DATETIME', 'NOT NULL'],
        ['signature', 'BLOB', 'NOT NULL'],
        ['receivedTimestamp', 'DATETIME', 'NOT NULL'],
        ['isOwnRecord', 'INTEGER', 'NOT NULL'],
      ],
      true,
    );
  }

  public put(key: Buffer, record: IKadRecord, isOwnRecord: boolean): void {
    this.insertObject({
      key,
      ...record,
      isOwnRecord: isOwnRecord ? 1 : 0 as any,
      receivedTimestamp: Date.now(),
    });
  }

  public get(key: Buffer): IKadRecievedRecord {
    const record= this.db
      .prepare(`select * from ${this.tableName} where key=$key`)
      .get({ key }) as IKadRecievedRecord;
    if (record) {
      record.isOwnRecord = Boolean(record.isOwnRecord);
    }
    return record;
  }

  public delete(key: Buffer): void {
    this.db.prepare(`delete from ${this.tableName} where key=$key`).run({ key });
  }

  public getIfNotExpired(key: Buffer): IKadRecievedRecord {
    const record = this.get(key);

    // Check validity: compare time received with max record age
    if (
      record &&
      !record.isOwnRecord &&
      Date.now() - record.receivedTimestamp > RecordsTable.MAX_RECORD_AGE
    ) {
      // If record is bad delete it and return
      this.delete(key);
      return;
    }

    return record;
  }
}

export interface IKadRecievedRecord extends IKadRecord {
  key: Buffer;
  receivedTimestamp: number;
  isOwnRecord: boolean;
}
