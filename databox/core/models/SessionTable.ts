import { Database as SqliteDatabase } from 'better-sqlite3';
import SqliteTable from '@ulixee/commons/lib/SqliteTable';

export default class SessionTable extends SqliteTable<ISessionRecord> {
  constructor(readonly db: SqliteDatabase) {
    super(
      db,
      'Session',
      [
        ['id', 'TEXT'],
        ['startDate', 'INTEGER'],
        ['closeDate', 'INTEGER'],
        ['scriptInstanceId', 'TEXT'],
        ['scriptEntrypoint', 'TEXT'],
        ['scriptStartDate', 'INTEGER'],
        ['createSessionOptions', 'TEXT'],
      ],
      true,
    );
  }

  public insert(
    id: string,
    startDate: number,
    scriptInstanceId: string,
    scriptEntrypoint: string,
    scriptStartDate: number,
    createSessionOptions: any,
  ): void {
    const record = [
      id,
      startDate,
      null,
      scriptInstanceId,
      scriptEntrypoint,
      scriptStartDate,
      JSON.stringify(createSessionOptions),
    ];
    this.insertNow(record);
  }

  public close(id: string, closeDate: number): void {
    const values = [closeDate, id];
    const fields = ['closeDate'];
    const sql = `UPDATE ${this.tableName} SET ${fields.map(n => `${n}=?`).join(', ')} WHERE id=?`;
    this.db.prepare(sql).run(...values);
    if (this.insertCallbackFn) this.insertCallbackFn([]);
  }

  public get(): ISessionRecord {
    return this.db.prepare(`select * from ${this.tableName}`).get() as ISessionRecord;
  }
}

export interface ISessionRecord {
  id: string;
  startDate: number;
  closeDate: number;
  scriptInstanceId: string;
  scriptEntrypoint: string;
  scriptStartDate: number;
  createSessionOptions: string;
}
