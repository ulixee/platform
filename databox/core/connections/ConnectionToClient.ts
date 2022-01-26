import ISessionMeta from '@ulixee/databox-interfaces/ISessionMeta';
import ISessionCreateOptions from '@ulixee/databox-interfaces/ISessionCreateOptions';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import ICoreRequestPayload from '@ulixee/databox-interfaces/ICoreRequestPayload';
import ICoreResponsePayload from '@ulixee/databox-interfaces/ICoreResponsePayload';
import ICoreConfigureOptions from '@ulixee/databox-interfaces/ICoreConfigureOptions';
import IDataboxMeta from '@ulixee/databox-interfaces/IDataboxMeta';
import Log from '@ulixee/commons/lib/Logger';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import SessionClosedOrMissingError from '@ulixee/commons/lib/SessionClosedOrMissingError';
import TimeoutError from '@ulixee/commons/interfaces/TimeoutError';
import Session from '../lib/Session';
import GlobalPool from '../lib/GlobalPool';
import Core from '../index';
import { IOutputChangeRecord } from '../models/OutputTable';

const { log } = Log(module);

export default class ConnectionToClient extends TypedEventEmitter<{
  close: { fatalError?: Error };
  message: ICoreResponsePayload;
}> {
  public isClosing = false;
  public isPersistent = true;
  public autoShutdownMillis = 500;

  private autoShutdownTimer: NodeJS.Timer;
  private readonly sessionIds = new Set<string>();
  private hasActiveCommand = false;

  private clientExposedMethods = new Map<string, keyof this & string>([
    ['Core.connect', 'connect'],
    ['Core.disconnect', 'disconnect'],
    ['Core.logUnhandledError', 'logUnhandledError'],
    ['Core.createSession', 'createSession'],
    ['Session.close', 'closeSession'],
    ['Session.flush', 'flush'],
    ['Session.getDataboxMeta', 'getDataboxMeta'],
    ['Session.recordOutput', 'recordOutput'],
  ]);

  ///////  CORE SERVER CONNECTION  /////////////////////////////////////////////////////////////////////////////////////

  public async handleRequest(payload: ICoreRequestPayload): Promise<void> {
    const { commandId, startDate, sendDate, messageId, command, meta, recordCommands } = payload;
    const session = meta?.sessionId ? Session.get(meta.sessionId) : undefined;

    // json converts args to null which breaks undefined argument handlers
    const args = payload.args.map(x => (x === null ? undefined : x));

    let data: any;
    try {
      this.hasActiveCommand = true;
      if (recordCommands) await this.recordCommands(meta, sendDate, recordCommands);
      data = await this.executeCommand(command, args, meta, { commandId, startDate, sendDate });
    } catch (error) {
      const isClosing = session?.isClosing || this.isClosing;
      // if we're closing, don't emit errors
      let shouldSkipLogging = isClosing && error instanceof CanceledPromiseError;

      // don't log timeouts when explicitly provided timeout (NOTE: doesn't cover goto)
      if (args && error instanceof TimeoutError) {
        for (const arg of args) {
          if (arg && !Number.isNaN(arg.timeoutMs)) {
            shouldSkipLogging = true;
          }
        }
      }

      const isChildProcess = !!process.send;

      if (isChildProcess === false && shouldSkipLogging === false) {
        log.error('ConnectionToClient.HandleRequestError', {
          error,
          sessionId: meta?.sessionId,
        });
      }
      data = this.serializeError(error);
      data.isDisconnecting = isClosing;
    } finally {
      this.hasActiveCommand = false;
    }

    const response: ICoreResponsePayload = {
      responseId: messageId,
      data,
    };
    this.emit('message', response);
  }

  public async connect(
    options: ICoreConfigureOptions & { isPersistent?: boolean } = {},
  ): Promise<{ maxConcurrency: number }> {
    this.isPersistent = options.isPersistent ?? true;
    this.isClosing = false;
    await Core.start(options, false);
    return {
      maxConcurrency: GlobalPool.maxConcurrentClientCount,
    };
  }

  public logUnhandledError(error: Error, fatalError = false): void {
    if (fatalError) {
      log.error('ConnectionToClient.UnhandledError(fatal)', {
        clientError: error,
        sessionId: null,
      });
    } else {
      log.error('ConnectionToClient.UnhandledErrorOrRejection', {
        clientError: error,
        sessionId: null,
      });
    }
  }

  public async disconnect(fatalError?: Error): Promise<void> {
    if (this.isClosing) return;
    this.isClosing = true;
    const logId = log.stats('ConnectionToClient.Disconnecting', { sessionId: null, fatalError });
    clearTimeout(this.autoShutdownTimer);
    const closeAll: Promise<any>[] = [];
    for (const id of this.sessionIds) {
      closeAll.push(this.closeSession({ sessionId: id }).catch(err => err));
    }
    await Promise.all(closeAll);
    this.isPersistent = false;
    this.emit('close', { fatalError });
    log.stats('ConnectionToClient.Disconnected', { sessionId: null, parentLogId: logId });
  }

  public isActive(): boolean {
    return this.sessionIds.size > 0 || this.isPersistent || this.hasActiveCommand;
  }

  ///////  SESSION /////////////////////////////////////////////////////////////////////////////////////////////////////

  public flush(meta: ISessionMeta): void {
    log.info('SessionFlushing', { sessionId: meta.sessionId });
  }

  public getDataboxMeta(meta: ISessionMeta): IDataboxMeta {
    const session = Session.get(meta.sessionId);
    return <IDataboxMeta>{
      input: session.options?.input,
      sessionId: session.id,
    };
  }

  public async createSession(options: ISessionCreateOptions = {}): Promise<ISessionMeta> {
    if (this.isClosing) throw new Error('Connection closed');
    clearTimeout(this.autoShutdownTimer);
    const session = await GlobalPool.createSession(options);
    this.sessionIds.add(session.id);
    session.on('closing', () => this.sessionIds.delete(session.id));
    session.on('closed', this.checkForAutoShutdown.bind(this));

    return this.getSessionMeta(session);
  }

  public async closeSession(sessionMeta: ISessionMeta): Promise<void> {
    const session = Session.get(sessionMeta.sessionId);
    if (!session) return;
    await session.close();
  }

  public recordOutput(meta: ISessionMeta, ...changes: IOutputChangeRecord[]): void {
    const session = Session.get(meta.sessionId);
    session.recordOutput(changes);
  }

  /////// INTERNAL FUNCTIONS /////////////////////////////////////////////////////////////////////////////

  private async recordCommands(
    meta: ISessionMeta,
    sendDate: Date,
    recordCommands: ICoreRequestPayload['recordCommands'],
  ): Promise<void> {
    for (const { command, args, commandId, startDate } of recordCommands) {
      try {
        const cleanArgs = args.map(x => (x === null ? undefined : x));
        await this.executeCommand(command, cleanArgs, meta, {
          commandId,
          startDate,
          sendDate,
        });
      } catch (error) {
        log.warn('RecordingCommandsFailed', {
          sessionId: meta.sessionId,
          error,
          command,
        });
      }
    }
  }

  private async executeCommand(
    command: string,
    args: any[],
    meta: ISessionMeta,
    commandMeta: { commandId: number; startDate: Date; sendDate: Date },
  ): Promise<any> {
    const target = command.split('.').shift();
    if (target === 'Core' || target === 'Session') {
      if (!this.clientExposedMethods.has(command)) {
        return new Error(`Command not allowed (${command})`);
      }

      const method = this.clientExposedMethods.get(command) as string;
      if (target === 'Core') {
        return await this[method](...args);
      }

      const session = Session.get(meta.sessionId);
      session.nextCommandMeta = commandMeta;
      if (!session) {
        return new SessionClosedOrMissingError(
          `The requested command (${command}) references a session that is closed or invalid.`,
        );
      }

      return await this[method](meta, ...args);
    }
  }

  private checkForAutoShutdown(): void {
    clearTimeout(this.autoShutdownTimer);
    this.autoShutdownTimer = (setTimeout(() => {
      if (this.isActive()) return;
      return this.disconnect();
    }, this.autoShutdownMillis) as any).unref();
  }

  private getSessionMeta(session: Session): ISessionMeta {
    return {
      sessionId: session.id,
    };
  }

  private serializeError(error: Error): object {
    if (error instanceof Error) return error;

    return new Error(`Unknown error occurred ${error}`);
  }
}
