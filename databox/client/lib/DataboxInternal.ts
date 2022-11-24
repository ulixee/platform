import ICoreResponsePayload from '@ulixee/net/interfaces/ICoreResponsePayload';
import IDataboxManifest from '@ulixee/specification/types/IDataboxManifest';
import { IDataboxApis } from '@ulixee/specification/databox';
import { IApiSpec } from '@ulixee/net/interfaces/IApiHandlers';
import IUnixTime from '@ulixee/net/interfaces/IUnixTime';
import ConnectionFactory from '../connections/ConnectionFactory';
import ConnectionToDataboxCore from '../connections/ConnectionToDataboxCore';
import DisconnectedFromCoreError from '../connections/DisconnectedFromCoreError';

let lastInstanceId = 0;

export default class DataboxInternal {
  #connectionToCore: ConnectionToDataboxCore;
  #isClosingPromise: Promise<void>;
  #createInMemoryDatabaseCallbacks: (() => void)[] = [];
  #createInMemoryDatabasePromise: Promise<void>;

  public manifest: IDataboxManifest;
  public instanceId: string;
  public loadingPromises: PromiseLike<void>[] = [];
  
  constructor() {
    lastInstanceId++;
    this.instanceId = `${process.pid}-${lastInstanceId}`;
  }

  private get connectionToCore(): ConnectionToDataboxCore {
    if (!this.#connectionToCore) {
      this.#connectionToCore = ConnectionFactory.createConnection();
    }
    return this.#connectionToCore;
  }

  public sendRequest<T extends keyof IDataboxApis & string>(
    payload: {
      command: T;
      args: IApiSpec<IDataboxApis>[T]['args'];
      commandId?: number;
      startTime?: IUnixTime;
    },
    timeoutMs?: number,
  ): Promise<ICoreResponsePayload<any, any>['data']> {
    return this.connectionToCore.sendRequest(payload, timeoutMs);
  }

  public onCreateInMemoryDatabase(callback: () => void): void {
    this.#createInMemoryDatabaseCallbacks.push(callback);
  }

  public ensureDatabaseExists(): Promise<void> {
    return (this.#createInMemoryDatabasePromise ??= new Promise(async (resolve, reject) => {
      try {
        await Promise.all(this.#createInMemoryDatabaseCallbacks.map(x => x()));
        resolve();
      } catch(error) {
        reject(error);
      }
    }));
  }

  public close(): Promise<void> {
    return (this.#isClosingPromise ??= new Promise(async (resolve, reject) => {
      try {
        const connectionToCore = await this.#connectionToCore;
        await connectionToCore?.disconnect();
      } catch (error) {
        if (!(error instanceof DisconnectedFromCoreError)) return reject(error);
      }
      resolve();
    }));
  } 
}