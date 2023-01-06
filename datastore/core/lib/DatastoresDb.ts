import * as Database from 'better-sqlite3';
import { Database as SqliteDatabase } from 'better-sqlite3';
import * as Fs from 'fs';
import DatastoresTable from './DatastoresTable';
import DatastoreVersionsTable from './DatastoreVersionsTable';
import DatastoreStatsTable from './DatastoreStatsTable';

export default class DatastoresDb {
  public readonly datastores: DatastoresTable;
  public readonly datastoreStats: DatastoreStatsTable;
  public readonly datastoreVersions: DatastoreVersionsTable;

  private db: SqliteDatabase;

  constructor(baseDir: string) {
    if (!Fs.existsSync(baseDir)) Fs.mkdirSync(baseDir, { recursive: true });
    this.db = new Database(`${baseDir}/index.db`);
    this.db.unsafeMode(false);
    this.db.pragma('journal_mode = WAL');

    this.datastores = new DatastoresTable(this.db);
    this.datastoreStats = new DatastoreStatsTable(this.db);
    this.datastoreVersions = new DatastoreVersionsTable(this.db);
  }

  public close(): void {
    if (this.db) {
      this.db.close();
    }
    this.db = null;
  }
}
