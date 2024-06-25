import Database = require('better-sqlite3');
import { Database as SqliteDatabase, Statement } from 'better-sqlite3';
import * as Fs from 'node:fs';

export default class DatabrokerDb {
  private db: SqliteDatabase;

  private whitelistQuery: Statement<{ domain: string }>;

  constructor(baseDir: string) {
    if (!Fs.existsSync(baseDir)) Fs.mkdirSync(baseDir, { recursive: true });
    this.db = new Database(`${baseDir}/datastore-whitelist.v0.db`);
    this.db.unsafeMode(false);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');

    this.db.exec(`CREATE TABLE IF NOT EXISTS DomainWhitelist (
domain TEXT NOT NULL PRIMARY KEY
);
`);
    this.db.exec(
      'CREATE UNIQUE INDEX IF NOT EXISTS DomainWhitelist_domain ON DomainWhitelist (domain);',
    );

    this.whitelistQuery = this.db.prepare(`SELECT 1 FROM DomainWhitelist WHERE domain = :domain`);
  }

  public close(): void {
    if (this.db) {
      this.db.close();
    }
    this.db = null;
  }

  public add(domain: string): void {
    this.db.prepare(`INSERT OR IGNORE INTO DomainWhitelist (domain) VALUES (:domain);`).run({ domain });
  }

  public delete(domain: string): void {
    this.db.prepare(`DELETE FROM DomainWhitelist WHERE domain = :domain;`).run({ domain });
  }

  public list(): string[] {
    return this.db.prepare(`SELECT domain FROM DomainWhitelist;`).pluck().all() as string[];
  }

  public isWhitelisted(_datastoreId: string, domain: string): boolean {
    return !!this.whitelistQuery.get({ domain });
  }
}
