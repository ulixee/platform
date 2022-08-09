import * as Database from 'better-sqlite3';
import { Database as SqliteDatabase } from 'better-sqlite3';
import * as Fs from 'fs';
import DataboxesTable from './DataboxesTable';
import DataboxVersionsTable from './DataboxVersionsTable';
import DataboxStatsTable from './DataboxStatsTable';

export default class DataboxesDb {
  public readonly databoxes: DataboxesTable;
  public readonly databoxStats: DataboxStatsTable;
  public readonly databoxVersions: DataboxVersionsTable;

  private db: SqliteDatabase;

  constructor(baseDir: string) {
    if (!Fs.existsSync(baseDir)) Fs.mkdirSync(baseDir, { recursive: true });
    this.db = new Database(`${baseDir}/index.db`);

    this.databoxes = new DataboxesTable(this.db);
    this.databoxStats = new DataboxStatsTable(this.db);
    this.databoxVersions = new DataboxVersionsTable(this.db);
  }

  public close(): void {
    if (this.db) {
      this.db.close();
    }
    this.db = null;
  }
}
