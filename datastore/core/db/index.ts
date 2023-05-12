import Database = require('better-sqlite3');
import { Database as SqliteDatabase } from 'better-sqlite3';
import * as Fs from 'fs';
import DatastoreVersionsTable from './DatastoreVersionsTable';
import DatastoreItemStatsTable from './DatastoreItemStatsTable';
import DatastoreStatsTable from './DatastoreStatsTable';
import env from '../env';

export default class DatastoresDb {
  public readonly datastoreStats: DatastoreStatsTable;
  public readonly datastoreItemStats: DatastoreItemStatsTable;
  public readonly datastoreVersions: DatastoreVersionsTable;

  private db: SqliteDatabase;

  constructor(baseDir: string) {
    if (!Fs.existsSync(baseDir)) Fs.mkdirSync(baseDir, { recursive: true });
    this.db = new Database(`${baseDir}/metadata.db`);
    if (env.enableSqliteWalMode) {
      this.db.unsafeMode(false);
      this.db.pragma('journal_mode = WAL');
    }

    this.datastoreStats = new DatastoreStatsTable(this.db);
    this.datastoreItemStats = new DatastoreItemStatsTable(this.db);
    this.datastoreVersions = new DatastoreVersionsTable(this.db);
  }

  public close(): void {
    if (this.db) {
      this.db.close();
    }
    this.db = null;
  }
}
