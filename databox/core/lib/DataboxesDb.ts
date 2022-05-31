import * as Database from 'better-sqlite3';
import { Database as SqliteDatabase, Transaction } from 'better-sqlite3';
import SqliteTable from '@ulixee/commons/lib/SqliteTable';
import Log from '@ulixee/commons/lib/Logger';
import * as Fs from 'fs';
import DataboxesTable from './DataboxesTable';

const { log } = Log(module);

export default class DataboxesDb {
  public readonly databoxes: DataboxesTable;
  private db: SqliteDatabase;
  private readonly batchInsert: Transaction;
  private readonly saveInterval: NodeJS.Timeout;
  private readonly tables: SqliteTable<any>[] = [];

  constructor(baseDir: string) {
    if (!Fs.existsSync(baseDir)) Fs.mkdirSync(baseDir, { recursive: true });
    this.db = new Database(`${baseDir}/databoxes.db`);
    this.databoxes = new DataboxesTable(this.db);
    this.saveInterval = setInterval(this.flush.bind(this), 5e3).unref();

    this.tables = [this.databoxes];

    this.batchInsert = this.db.transaction(() => {
      for (const table of this.tables) {
        try {
          table.runPendingInserts();
        } catch (error) {
          if (
            String(error).match(/attempt to write a readonly database/) ||
            String(error).match(/database is locked/)
          ) {
            clearInterval(this.saveInterval);
            this.db = null;
          }
          log.error('DataboxesDb.flushError', {
            sessionId: null,
            error,
            table: table.tableName,
          });
        }
      }
    });
  }

  public close(): void {
    if (this.db) {
      clearInterval(this.saveInterval);
      this.flush();
      this.db.close();
    }
    this.db = null;
  }

  public flush(): void {
    if (!this.db || this.db.readonly) return;
    this.batchInsert.immediate();
  }
}
