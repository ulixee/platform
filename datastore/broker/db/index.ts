import Database = require('better-sqlite3');
import { Database as SqliteDatabase } from 'better-sqlite3';
import * as Fs from 'node:fs';
import ChannelHoldsTable from './ChannelHoldsTable';
import OrganizationsTable from './OrganizationsTable';
import UsersTable from './UsersTable';

export default class DatabrokerDb {
  public readonly organizations: OrganizationsTable;
  public readonly users: UsersTable;
  public readonly channelHolds: ChannelHoldsTable;

  private db: SqliteDatabase;

  constructor(baseDir: string) {
    if (!Fs.existsSync(baseDir)) Fs.mkdirSync(baseDir, { recursive: true });
    this.db = new Database(`${baseDir}/databroker.v0.db`);
    this.db.unsafeMode(false);
    this.db.defaultSafeIntegers(true);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');

    this.organizations = new OrganizationsTable(this.db);
    this.users = new UsersTable(this.db);
    this.channelHolds = new ChannelHoldsTable(this.db);
  }

  public close(): void {
    if (this.db) {
      this.db.close();
    }
    this.db = null;
  }

  public transaction<T>(fn: () => T): T {
    return this.db.transaction(fn).default();
  }

  public exec(sql: string): void {
    this.db.exec(sql);
  }
}
