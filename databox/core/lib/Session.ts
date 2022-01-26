import { nanoid } from 'nanoid';
import Log from '@ulixee/commons/lib/Logger';
import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import ISessionCreateOptions from '@ulixee/databox-interfaces/ISessionCreateOptions';
import { IOutputChangeRecord } from '../models/OutputTable';
import SessionDb from '../dbs/SessionDb';
import SessionsDb from '../dbs/SessionsDb';

const { log } = Log(module);

export default class Session extends TypedEventEmitter<{
  closing: void;
  closed: void;
  output: { changes: IOutputChangeRecord[] };
}> {
  private static readonly byId: { [id: string]: Session } = {};

  public readonly db: SessionDb;
  public readonly id: string;
  public readonly startDate = Date.now();
  public nextCommandMeta: { commandId: number; startDate: Date; sendDate: Date };
  public isClosing = false;

  protected readonly logger: IBoundLog;

  constructor(readonly options: ISessionCreateOptions) {
    super();
    this.id = nanoid();
    Session.byId[this.id] = this;
    this.logger = log.createChild(module, { sessionId: this.id });
    this.db = new SessionDb(this.id);
  }

  public recordOutput(changes: IOutputChangeRecord[]): void {
    for (const change of changes) {
      this.db.output.insert(change);
    }
    this.emit('output', { changes });
  }

  public recordSession(options: { sessionOptions: ISessionCreateOptions }): void {
    const { scriptInstanceMeta, ...optionsToStore } = options.sessionOptions;
    this.db.session.insert(
      this.id,
      this.startDate,
      scriptInstanceMeta?.id,
      scriptInstanceMeta?.entrypoint,
      scriptInstanceMeta?.startDate,
      optionsToStore,
    );

    if (scriptInstanceMeta) {
      const sessionsDb = SessionsDb.find();
      sessionsDb.sessions.insert(
        this.id,
        Date.now(),
        scriptInstanceMeta.id,
        scriptInstanceMeta.entrypoint,
        scriptInstanceMeta.startDate,
      );
    }
  }

  public close(): void {
    delete Session.byId[this.id];
    if (this.isClosing) return;
    this.emit('closing');
    this.isClosing = true;
    const start = log.info('Session.Closing', {
      sessionId: this.id,
    });

    this.db.session.close(this.id, Date.now());
    log.stats('Session.Closed', {
      sessionId: this.id,
      parentLogId: start,
    });
    this.db.flush();
    this.emit('closed');
    this.db.close();
  }

  public static get(sessionId: string): Session {
    if (!sessionId) return null;
    return this.byId[sessionId];
  }
}
