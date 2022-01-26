import { Database as SqliteDatabase } from 'better-sqlite3';
import SqliteTable from '@ulixee/commons/lib/SqliteTable';

export default class SessionsTable extends SqliteTable<ISessionRecord> {
  constructor(readonly db: SqliteDatabase) {
    super(db, 'Sessions', [
      ['id', 'TEXT'],
      ['startDate', 'TEXT'],
      ['scriptInstanceId', 'TEXT'],
      ['scriptEntrypoint', 'TEXT'],
      ['scriptStartDate', 'TEXT'],
    ]);
  }

  public insert(
    id: string,
    startDate: number,
    scriptInstanceId: string,
    scriptEntrypoint: string,
    scriptStartDate: number,
  ): void {
    const record = [
      id,
      new Date(startDate).toISOString(),
      scriptInstanceId,
      scriptEntrypoint,
      new Date(scriptStartDate).toISOString(),
    ];
    this.insertNow(record);
  }

  public findByName(name: string, scriptInstanceId: string): ISessionRecord {
    const sql = `SELECT * FROM ${this.tableName} WHERE name=? AND scriptInstanceId=? ORDER BY scriptStartDate DESC, startDate DESC LIMIT 1`;
    return this.db.prepare(sql).get([name, scriptInstanceId]) as ISessionRecord;
  }

  public findByScriptEntrypoint(scriptEntrypoint, limit = 50): ISessionRecord[] {
    const sql = `SELECT * FROM ${
      this.tableName
    } WHERE scriptEntrypoint=? ORDER BY scriptStartDate DESC, startDate DESC limit ${limit ?? 50}`;
    return this.db.prepare(sql).all([scriptEntrypoint]) as ISessionRecord[];
  }
}

export interface ISessionRecord {
  id: string;
  startDate: string;
  scriptInstanceId: string;
  scriptEntrypoint: string;
  scriptStartDate: string;
}
