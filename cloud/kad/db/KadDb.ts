import Database = require('better-sqlite3');
import { Database as SqliteDatabase } from 'better-sqlite3';
import * as Fs from 'fs';
import * as Path from 'path';
import PeersTable from './PeersTable';
import ProvidersTable from './ProvidersTable';

export default class KadDb {
  public readonly peers: PeersTable;
  public readonly providers: ProvidersTable;

  public get isOpen(): boolean {
    return this.db?.open ?? false;
  }

  private db: SqliteDatabase;

  constructor(dbPath: string) {
    const baseDir = Path.dirname(dbPath);
    if (!Fs.existsSync(baseDir)) Fs.mkdirSync(baseDir, { recursive: true });
    this.db = new Database(dbPath);
    this.db.unsafeMode(false);
    this.db.pragma('journal_mode = WAL');

    this.peers = new PeersTable(this.db);
    this.providers = new ProvidersTable(this.db);
  }

  public close(): void {
    if (this.db?.open) {
      this.db?.close();
    }
    this.db = null;
  }
}
