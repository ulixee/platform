import ISessionMeta from '@ulixee/databox-interfaces/ISessionMeta';
import { loggerSessionIdNames } from '@ulixee/commons/lib/Logger';
import IDataboxMeta from '@ulixee/databox-interfaces/IDataboxMeta';
import ICoreSession from '@ulixee/databox-interfaces/ICoreSession';
import CoreCommandQueue from './CoreCommandQueue';
import ConnectionToCore from '../connections/ConnectionToCore';

export default class CoreSession implements ICoreSession {
  #commandId = 0;
  #lastExternalId = 0;

  public sessionId: string;
  public commandQueue: CoreCommandQueue;

  protected readonly meta: ISessionMeta;
  private readonly connectionToCore: ConnectionToCore;

  constructor(sessionMeta: ISessionMeta, connectionToCore: ConnectionToCore) {
    const { sessionId } = sessionMeta;
    this.sessionId = sessionId;
    this.meta = {
      sessionId,
    };
    this.connectionToCore = connectionToCore;
    this.commandQueue = new CoreCommandQueue({ sessionId }, connectionToCore, this);
  }

  public set lastExternalId(lastExternalId: number) {
    this.#lastExternalId = lastExternalId;
  }

  public get lastCommandId(): number {
    return this.#commandId;
  }

  public get nextCommandId(): number {
    this.#commandId += 1;
    return this.#commandId;
  }

  public getDataboxMeta(): Promise<IDataboxMeta> {
    return this.commandQueue.run('Session.getDataboxMeta');
  }

  public recordOutput(
    changes: { type: string; value: any; path: string; timestamp: Date }[],
  ): void {
    for (const change of changes as any[]) {
      change.lastCommandId = this.lastCommandId;
      change.lastExternalId = this.#lastExternalId;
    }
    this.commandQueue.record({ command: 'Session.recordOutput', args: changes });
  }

  public async close(): Promise<void> {
    try {
      await new Promise(resolve => process.nextTick(() => resolve(this.commandQueue.flush())));
      await this.commandQueue.run('Session.close');
    } finally {
      process.nextTick(() => this.connectionToCore.closeSession(this));
      loggerSessionIdNames.delete(this.sessionId);
    }
  }
}
