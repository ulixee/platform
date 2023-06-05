import Database = require('better-sqlite3');
import { Database as SqliteDatabase } from 'better-sqlite3';
import * as Fs from 'fs';
import DatastoreStatsTable from './DatastoreStatsTable';
import DatastoreEntityStatsTable from './DatastoreEntityStatsTable';
import env from '../env';

export default class StatsDb {
  public readonly datastores: DatastoreStatsTable;
  public readonly datastoreEntities: DatastoreEntityStatsTable;

  private db: SqliteDatabase;

  constructor(baseDir: string) {
    if (!Fs.existsSync(baseDir)) Fs.mkdirSync(baseDir, { recursive: true });
    this.db = new Database(`${baseDir}/stats.db`);
    if (env.enableSqliteWalMode) {
      this.db.unsafeMode(false);
      this.db.pragma('journal_mode = WAL');
    }

    this.datastores = new DatastoreStatsTable(this.db);
    this.datastoreEntities = new DatastoreEntityStatsTable(this.db);
  }

  public close(): void {
    if (this.db) {
      this.db.close();
    }
    this.db = null;
  }
}
