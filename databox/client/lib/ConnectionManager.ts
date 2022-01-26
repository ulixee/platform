import ISessionCreateOptions from '@ulixee/databox-interfaces/ISessionCreateOptions';
import IDataboxRunOptions from '@ulixee/databox-interfaces/IDataboxRunOptions';
import ConnectionToCore from '../connections/ConnectionToCore';
import CoreSession from './CoreSession';
import ConnectionFactory, { ICreateConnectionToCoreFn } from '../connections/ConnectionFactory';

type IStateOptions = ISessionCreateOptions & Pick<IDataboxRunOptions, 'connectionToCore'> & {
  createConnectionToCoreFn?: ICreateConnectionToCoreFn;
}

export default class ConnectionManager {
  readonly #connectionToCore: ConnectionToCore;
  readonly #didCreateConnection: boolean = false;
  readonly #coreSessionPromise: Promise<CoreSession | Error>;
  #coreSessionError: Error;
  #coreSession: CoreSession;
  #lastExternalId = 0;

  public hasConnected = false;

  constructor(stateOptions: IStateOptions) {
    const { createConnectionToCoreFn, connectionToCore, ...options } = stateOptions;

    this.#connectionToCore = ConnectionFactory.createConnection(
      connectionToCore ?? { isPersistent: false },
      createConnectionToCoreFn,
    );

    if (this.#connectionToCore !== connectionToCore) {
      this.#didCreateConnection = true;
    }

    this.#coreSessionPromise = this.#connectionToCore.createSession(options).catch(err => err).then(result => {
      this.hasConnected = true;
      if (result instanceof CoreSession) {
        this.#coreSession = result;
        this.#coreSession.lastExternalId = this.#lastExternalId;
      } else {
        this.#coreSessionError = result;
      }
      return result;
    });
  }

  public set lastExternalId(lastExternalId: number) {
    this.#lastExternalId = lastExternalId;
    if (this.#coreSession) {
      this.#coreSession.lastExternalId = lastExternalId;
    }
  }

  public get lastExternalId(): number {
    return this.#lastExternalId;
  }

  public get host(): Promise<string> {
    return this.#connectionToCore.hostOrError.then(x => {
      if (x instanceof Error) throw x;
      return x;
    });
  }

  public async close(): Promise<void> {
    if (!this.hasConnected) return;
    if (this.#coreSession) {
      await this.#coreSession.close();
    }
    if (this.#didCreateConnection) {
      await this.#connectionToCore.disconnect();
    }
  }

  public async getConnectedCoreSessionOrReject(): Promise<CoreSession> {
    await this.#coreSessionPromise;
    if (this.#coreSessionError) {
      throw this.#coreSessionError;
    }
    return this.#coreSession;
  }
}
