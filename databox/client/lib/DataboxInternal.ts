import ICoreResponsePayload from '@ulixee/net/interfaces/ICoreResponsePayload';
import IDataboxManifest from '@ulixee/specification/types/IDataboxManifest';
import { IDataboxApis } from '@ulixee/specification/databox';
import { IApiSpec } from '@ulixee/net/interfaces/IApiHandlers';
import IUnixTime from '@ulixee/net/interfaces/IUnixTime';
import ConnectionFactory from '../connections/ConnectionFactory';
import ConnectionToDataboxCore from '../connections/ConnectionToDataboxCore';
import DisconnectedFromCoreError from '../connections/DisconnectedFromCoreError';
import IDataboxComponents from '../interfaces/IDataboxComponents';
import Function from './Function';
import Table from './Table';

let lastInstanceId = 0;

export type IFunctions<
  TTable extends Table<any>,
  TFunction extends Function<any>,
  TComponents extends IDataboxComponents<TTable, TFunction> = IDataboxComponents<TTable, TFunction>,
  TFunctionNames extends keyof TComponents['functions'] & string = keyof TComponents['functions'] &string,
> = {
  [T in TFunctionNames]: TComponents['functions'][T] extends Function<any>
  ? TComponents['functions'][T]
  : never;
};

export type ITables<
  TTable extends Table<any>,
  TFunction extends Function<any>,
  TComponents extends IDataboxComponents<TTable, TFunction> = IDataboxComponents<TTable, TFunction>,
  TTableNames extends keyof TComponents['tables'] & string = keyof TComponents['tables'] & string,
> = {
  [T in TTableNames]: TComponents['tables'][T] extends Table<any>
  ? TComponents['tables'][T]
  : never;
};

export default class DataboxInternal<
  TTable extends Table<any>,
  TFunction extends Function<any>,
  TComponents extends IDataboxComponents<TTable, TFunction> = IDataboxComponents<TTable, TFunction>,
> {
  #connectionToCore: ConnectionToDataboxCore;
  #isClosingPromise: Promise<void>;
  #createInMemoryDatabaseCallbacks: (() => void)[] = [];
  #createInMemoryDatabasePromise: Promise<void>;

  public manifest: IDataboxManifest;
  public instanceId: string;
  public loadingPromises: PromiseLike<void>[] = [];
  public components: TComponents;
  public readonly functions: IFunctions<TTable, TFunction> = {} as any;
  public readonly tables: ITables<TTable, TFunction> = {} as any;

  constructor(components) {
    lastInstanceId++;
    this.instanceId = `${process.pid}-${lastInstanceId}`;
    this.components = components;
  }

  public get connectionToCore(): ConnectionToDataboxCore {
    if (!this.#connectionToCore) {
      this.#connectionToCore = ConnectionFactory.createConnection();
    }
    return this.#connectionToCore;
  }

  public set connectionToCore(connectionToCore: ConnectionToDataboxCore) {
    this.#connectionToCore = connectionToCore;
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

  public attachFunction(func: Function, nameOverride?: string, isAlreadyAttachedToDatabox?: boolean): void {
    const isFunction = func instanceof Function;
    const name = nameOverride || func.name
    if (!name) throw new Error(`Function requires a name`);
    if (!isFunction) throw new Error(`${name} must be an instance of Function`);
    if (this.tables[name]) throw new Error(`Function already exists with name: ${name}`);

    if (!isAlreadyAttachedToDatabox) func.attachToDatabox(this, name);
    this.functions[name] = func as any;
  }

  public attachTable(table: Table, nameOverride?: string, isAlreadyAttachedToDatabox?: boolean): void {
    const isTable = table instanceof Table;
    const name = nameOverride || table.name
    if (!name) throw new Error(`Table requires a name`);
    if (!isTable) throw new Error(`${name || 'table'} must be an instance of Table`);
    if (this.tables[name]) throw new Error(`Table already exists with name: ${name}`);

    if (!isAlreadyAttachedToDatabox) table.attachToDatabox(this, name);
    this.tables[name] = table as any;
  }
}