import Log from '@ulixee/commons/lib/Logger';
import IResolvablePromise from '@ulixee/commons/interfaces/IResolvablePromise';
import { createPromise } from '@ulixee/commons/lib/utils';
import ISessionCreateOptions from '@ulixee/databox-interfaces/ISessionCreateOptions';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import SessionsDb from '../dbs/SessionsDb';
import Session from './Session';
import SessionDb from '../dbs/SessionDb';

const { log } = Log(module);

export default class GlobalPool {
  public static maxConcurrentClientCount = 10;
  public static localProxyPortStart = 0;

  public static get activeSessionCount(): number {
    return this._activeSessionCount;
  }

  public static get hasAvailability(): boolean {
    return this.activeSessionCount < GlobalPool.maxConcurrentClientCount;
  }

  private static isClosing = false;
  private static _activeSessionCount = 0;
  private static waitingForAvailability: {
    options: ISessionCreateOptions;
    promise: IResolvablePromise<Session>;
  }[] = [];

  public static start(): Promise<void> {
    this.isClosing = false;
    log.info('StartingGlobalPool', {
      sessionId: null,
    });
    SessionDb.start();
    SessionsDb.start();

    return Promise.resolve();
  }

  public static createSession(options: ISessionCreateOptions): Promise<Session> {
    log.info('AcquiringSession', {
      sessionId: null,
      activeSessionCount: this.activeSessionCount,
      waitingForAvailability: this.waitingForAvailability.length,
      maxConcurrentClientCount: this.maxConcurrentClientCount,
    });

    if (!this.hasAvailability) {
      const resolvablePromise = createPromise<Session>();
      this.waitingForAvailability.push({ options, promise: resolvablePromise });
      return resolvablePromise.promise;
    }
    return this.createSessionNow(options);
  }

  public static close(): Promise<void> {
    if (this.isClosing) return Promise.resolve();
    this.isClosing = true;
    const logId = log.stats('GlobalPool.Closing', {
      sessionId: null,
      waitingForAvailability: this.waitingForAvailability.length,
    });

    for (const { promise } of this.waitingForAvailability) {
      promise.reject(new CanceledPromiseError('Puppet pool shutting down'));
    }
    this.waitingForAvailability.length = 0;
    const closePromises: Promise<any>[] = [];
    SessionsDb.shutdown();
    return Promise.all(closePromises)
      .then(() => {
        log.stats('GlobalPool.Closed', { parentLogId: logId, sessionId: null });
        return null;
      })
      .catch(error => {
        log.error('Error in GlobalPoolShutdown', { parentLogId: logId, sessionId: null, error });
      });
  }

  private static createSessionNow(options: ISessionCreateOptions): Promise<Session> {
    this._activeSessionCount += 1;
    try {
      const session = new Session(options);
      session.once('closing', this.releaseConnection.bind(this));
      return Promise.resolve(session);
    } catch (err) {
      this._activeSessionCount -= 1;
      throw err;
    }
  }

  private static releaseConnection(): void {
    this._activeSessionCount -= 1;

    const wasTransferred = this.resolveWaitingConnection();
    if (wasTransferred) {
      log.info('ReleasingSession', {
        sessionId: null,
        activeSessionCount: this.activeSessionCount,
        waitingForAvailability: this.waitingForAvailability.length,
      });
    }
  }

  private static resolveWaitingConnection(): boolean {
    if (!this.waitingForAvailability.length) {
      return false;
    }
    const { options, promise } = this.waitingForAvailability.shift();

    // NOTE: we want this to blow up if an exception occurs inside the promise
    // eslint-disable-next-line promise/catch-or-return,@typescript-eslint/no-floating-promises
    this.createSessionNow(options).then(session => promise.resolve(session));

    log.info('TransferredSessionToWaitingAcquirer');
    return true;
  }
}
