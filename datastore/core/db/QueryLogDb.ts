import Database = require('better-sqlite3');
import { Database as SqliteDatabase } from 'better-sqlite3';
import * as Fs from 'fs';
import QueryLogTable from './QueryLogTable';
import env from '../env';

export default class QueryLogDb {
  public readonly logTable: QueryLogTable;

  private db: SqliteDatabase;

  constructor(baseDir: string) {
    if (!Fs.existsSync(baseDir)) Fs.mkdirSync(baseDir, { recursive: true });
    this.db = new Database(`${baseDir}/querylog.db`);
    if (env.enableSqliteWalMode) {
      this.db.unsafeMode(false);
      this.db.pragma('journal_mode = WAL');
    }

    this.logTable = new QueryLogTable(this.db);
  }

  public close(): void {
    if (this.db?.open) {
      this.db?.close();
    }
    this.db = null;
  }
}
