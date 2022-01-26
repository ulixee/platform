import * as Database from 'better-sqlite3';
import { Database as SqliteDatabase, Transaction } from 'better-sqlite3';
import Log from '@ulixee/commons/lib/Logger';
import SqliteTable from '@ulixee/commons/lib/SqliteTable';
import * as Fs from 'fs';
import { existsSync } from 'fs';
import SessionTable from '../models/SessionTable';
import SessionsDb from './SessionsDb';
import OutputTable from '../models/OutputTable';
import Core from '../index';

const { log } = Log(module);

interface IDbOptions {
  readonly?: boolean;
  fileMustExist?: boolean;
}

export default class SessionDb {
  private static byId = new Map<string, SessionDb>();
  private static isDatabaseDirValid = false;

  public get readonly(): boolean {
    return this.db?.readonly;
  }

  public readonly output: OutputTable;
  public readonly session: SessionTable;
  public readonly sessionId: string;

  private readonly batchInsert?: Transaction;
  private readonly saveInterval: NodeJS.Timeout;

  private db: SqliteDatabase;
  private readonly tables: SqliteTable<any>[] = [];

  constructor(id: string, dbOptions: IDbOptions = {}) {
    SessionDb.start();

    const { readonly = false, fileMustExist = false } = dbOptions;
    this.sessionId = id;
    this.db = new Database(`${SessionDb.databaseDir}/${id}.db`, { readonly, fileMustExist });
    if (!readonly) {
      this.saveInterval = (setInterval(this.flush.bind(this), 5e3) as any).unref();
    }

    this.session = new SessionTable(this.db);
    this.output = new OutputTable(this.db);

    this.tables.push(this.session, this.output);

    if (!readonly) {
      this.batchInsert = this.db.transaction(() => {
        for (const table of this.tables) {
          try {
            table.runPendingInserts();
          } catch (error) {
            if (String(error).match('attempt to write a readonly database')) {
              clearInterval(this.saveInterval);
              this.db = null;
            }
            log.error('SessionDb.flushError', {
              sessionId: this.sessionId,
              error,
              table: table.tableName,
            });
          }
        }
      });
    }
  }

  public close(): void {
    clearInterval(this.saveInterval);
    if (this.db) {
      this.flush();
      this.db.close();
    }
    this.db = null;
  }

  public flush(): void {
    if (this.batchInsert) {
      try {
        this.batchInsert.immediate();
      } catch (error) {
        if (String(error).match(/attempt to write a readonly database/)) {
          clearInterval(this.saveInterval);
        }
        throw error;
      }
    }
  }

  public unsubscribeToChanges(): void {
    for (const table of this.tables) table.unsubscribe();
  }

  public static getCached(sessionId: string, fileMustExist = false): SessionDb {
    if (!this.byId.get(sessionId)?.db?.open) {
      this.byId.set(
        sessionId,
        new SessionDb(sessionId, {
          readonly: true,
          fileMustExist,
        }),
      );
    }
    return this.byId.get(sessionId);
  }

  public static findWithRelated(scriptArgs: ISessionLookupArgs): ISessionLookup {
    let { sessionId } = scriptArgs;

    // NOTE: don't close db - it's from a shared cache
    const sessionsDb = SessionsDb.find();
    if (!sessionId) {
      sessionId = sessionsDb.findLatestSessionId(scriptArgs);
      if (!sessionId) return null;
    }

    const sessionDb = this.getCached(sessionId, true);
    const session = sessionDb.session.get();
    const related = sessionsDb.findRelatedSessions(session);

    return {
      ...related,
      sessionDb,
    };
  }

  public static get databaseDir(): string {
    return `${Core.dataDir}/databox-instances`;
  }

  public static start(): void {
    if (this.isDatabaseDirValid) return;
    if (!existsSync(this.databaseDir)) Fs.mkdirSync(this.databaseDir, { recursive: true });
    this.isDatabaseDirValid = true;
  }
}

export interface ISessionLookup {
  sessionDb: SessionDb;
  relatedSessions: { id: string }[];
  relatedScriptInstances: { id: string; startDate: number; defaultSessionId: string }[];
}

export interface ISessionLookupArgs {
  scriptInstanceId: string;
  sessionName: string;
  scriptEntrypoint: string;
  sessionId: string;
}
