import * as Database from 'better-sqlite3';
import { Database as SqliteDatabase } from 'better-sqlite3';
import * as Fs from 'fs';
import { existsSync } from 'fs';
import SessionsTable from '../models/SessionsTable';
import Core from '../index';

interface IDbOptions {
  readonly?: boolean;
  fileMustExist?: boolean;
}

interface IRelatedScriptInstance {
  id: string;
  startDate: number;
  defaultSessionId: string;
}

interface IRelatedSession {
  id: string;
}

export default class SessionsDb {
  private static instance: SessionsDb;
  private static isDatabaseDirValid: boolean;

  public readonly sessions: SessionsTable;
  public readonly readonly: boolean;
  private db: SqliteDatabase;

  constructor(dbOptions: IDbOptions = {}) {
    SessionsDb.start();

    const { readonly = false, fileMustExist = false } = dbOptions;
    this.db = new Database(SessionsDb.databasePath, { readonly, fileMustExist });
    this.readonly = readonly;
    this.sessions = new SessionsTable(this.db);
  }

  public findLatestSessionId(script: {
    sessionName: string;
    scriptInstanceId: string;
    scriptEntrypoint?: string;
  }): string {
    const { sessionName, scriptEntrypoint, scriptInstanceId } = script;
    if (sessionName && scriptInstanceId) {
      // find default session if current not available
      const sessionRecord =
        this.sessions.findByName(sessionName, scriptInstanceId) ??
        this.sessions.findByName('default-session', scriptInstanceId);
      return sessionRecord?.id;
    }
    if (scriptEntrypoint) {
      const sessionRecords = this.sessions.findByScriptEntrypoint(scriptEntrypoint);
      if (!sessionRecords.length) return undefined;
      return sessionRecords[0].id;
    }
  }

  public findRelatedSessions(session: { scriptEntrypoint: string; scriptInstanceId: string }): {
    relatedSessions: IRelatedSession[];
    relatedScriptInstances: IRelatedScriptInstance[];
  } {
    const otherSessions = this.sessions.findByScriptEntrypoint(session.scriptEntrypoint);
    const relatedScriptInstances: IRelatedScriptInstance[] = [];
    const relatedSessions: IRelatedSession[] = [];
    const scriptDates = new Set<string>();
    for (const otherSession of otherSessions) {
      const key = `${otherSession.scriptInstanceId}_${otherSession.scriptStartDate}`;
      if (!scriptDates.has(key)) {
        relatedScriptInstances.push({
          id: otherSession.scriptInstanceId,
          startDate: new Date(otherSession.scriptStartDate).getTime(),
          defaultSessionId: otherSession.id,
        });
      }
      if (otherSession.scriptInstanceId === session.scriptInstanceId) {
        relatedSessions.unshift({ id: otherSession.id });
      }
      scriptDates.add(key);
    }
    return {
      relatedSessions,
      relatedScriptInstances,
    };
  }

  public close(): void {
    if (this.db) {
      this.db.close();
    }
    this.db = null;
    SessionsDb.instance = undefined;
  }

  public static shutdown(): void {
    SessionsDb.instance?.close();
    SessionsDb.instance = undefined;
  }

  public static find(): SessionsDb {
    SessionsDb.instance ??= new SessionsDb();
    return SessionsDb.instance;
  }

  public static get databaseDir(): string {
    return Core.dataDir;
  }

  public static get databasePath(): string {
    return `${this.databaseDir}/databox-instances.db`;
  }

  public static start(): void {
    if (this.isDatabaseDirValid) return;
    if (!existsSync(this.databaseDir)) Fs.mkdirSync(this.databaseDir, { recursive: true });
    this.isDatabaseDirValid = true;
  }
}
