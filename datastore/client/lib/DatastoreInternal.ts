import ICoreResponsePayload from '@ulixee/net/interfaces/ICoreResponsePayload';
import IDatastoreManifest from '@ulixee/specification/types/IDatastoreManifest';
import { IDatastoreApis } from '@ulixee/specification/datastore';
import { IApiSpec } from '@ulixee/net/interfaces/IApiHandlers';
import IUnixTime from '@ulixee/net/interfaces/IUnixTime';
import ConnectionFactory from '../connections/ConnectionFactory';
import ConnectionToDatastoreCore from '../connections/ConnectionToDatastoreCore';
import IDatastoreComponents, {
  TCrawlers,
  TFunctions,
  TTables,
} from '../interfaces/IDatastoreComponents';
import Function from './Function';
import Table from './Table';
import type Crawler from './Crawler';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';
import type PassthroughFunction from './PassthroughFunction';
import PassthroughTable from './PassthroughTable';

const pkg = require('../package.json');

let lastInstanceId = 0;

export default class DatastoreInternal<
  TTable extends TTables<any> = TTables<any>,
  TFunction extends TFunctions<any> = TFunctions<any>,
  TCrawler extends TCrawlers<any> = TCrawlers<any>,
  TComponents extends IDatastoreComponents<TTable, TFunction, TCrawler> = IDatastoreComponents<
    TTable,
    TFunction,
    TCrawler
  >,
> {
  #connectionToCore: ConnectionToDatastoreCore;
  #isClosingPromise: Promise<void>;
  #createInMemoryDatabaseCallbacks: (() => void)[] = [];
  #createInMemoryDatabasePromise: Promise<void>;

  public manifest: IDatastoreManifest;
  public readonly metadata: IDatastoreMetadata;
  public instanceId: string;
  public loadingPromises: PromiseLike<void>[] = [];
  public components: TComponents;
  public readonly functions: TFunction = {} as any;
  public readonly tables: TTable = {} as any;
  public readonly crawlers: TCrawler = {} as any;

  public get remoteDatastores(): TComponents['remoteDatastores'] {
    return this.components.remoteDatastores;
  }

  public get authenticateIdentity(): TComponents['authenticateIdentity'] {
    return this.components.authenticateIdentity;
  }

  public get connectionToCore(): ConnectionToDatastoreCore {
    if (!this.#connectionToCore) {
      this.#connectionToCore = ConnectionFactory.createConnection();
    }
    return this.#connectionToCore;
  }

  public set connectionToCore(connectionToCore: ConnectionToDatastoreCore) {
    this.#connectionToCore = connectionToCore;
  }

  constructor(components: TComponents) {
    lastInstanceId++;
    this.instanceId = `${process.pid}-${lastInstanceId}`;
    this.components = components;
    for (const [name, func] of Object.entries(components.functions || [])) {
      this.attachFunction(func, name);
    }
    for (const [name, table] of Object.entries(components.tables || [])) {
      this.attachTable(table, name);
    }
    for (const [name, crawler] of Object.entries(components.crawlers || [])) {
      this.attachCrawler(crawler, name);
    }

    this.metadata = this.createMetadata();
  }

  public sendRequest<T extends keyof IDatastoreApis & string>(
    payload: {
      command: T;
      args: IApiSpec<IDatastoreApis>[T]['args'];
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
      } catch (error) {
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
        return reject(error);
      }
      resolve();
    }));
  }

  public attachFunction(
    func: Function,
    nameOverride?: string,
    isAlreadyAttachedToDatastore?: boolean,
  ): void {
    const isFunction = func instanceof Function;
    const name = nameOverride || func.name;
    if (!name) throw new Error(`Function requires a name`);
    if (!isFunction) throw new Error(`${name} must be an instance of Function`);
    if (this.functions[name]) throw new Error(`Function already exists with name: ${name}`);

    if (!isAlreadyAttachedToDatastore) func.attachToDatastore(this, name);
    (this.functions as any)[name] = func;
  }

  public attachCrawler(
    crawler: Crawler,
    nameOverride?: string,
    isAlreadyAttachedToDatastore?: boolean,
  ): void {
    // NOTE: can't check instanceof Crawler because it creates a dependency loop
    const isCrawler = crawler instanceof Function && crawler.functionType === 'crawler';
    const name = nameOverride || crawler.name;
    if (!name) throw new Error(`Crawler requires a name`);
    if (!isCrawler) throw new Error(`${name} must be an instance of Crawler`);
    if (this.crawlers[name]) throw new Error(`Crawler already exists with name: ${name}`);

    if (!isAlreadyAttachedToDatastore) crawler.attachToDatastore(this, name);
    (this.crawlers as any)[name] = crawler;
  }

  public attachTable(
    table: Table,
    nameOverride?: string,
    isAlreadyAttachedToDatastore?: boolean,
  ): void {
    const isTable = table instanceof Table;
    const name = nameOverride || table.name;
    if (!name) throw new Error(`Table requires a name`);
    if (!isTable) throw new Error(`${name || 'table'} must be an instance of Table`);
    if (this.tables[name]) throw new Error(`Table already exists with name: ${name}`);

    if (!isAlreadyAttachedToDatastore) table.attachToDatastore(this, name);
    (this.tables as any)[name] = table;
  }

  private createMetadata(): IDatastoreMetadata {
    const { name, description, paymentAddress, giftCardIssuerIdentity, remoteDatastores } =
      this.components;

    const metadata = {
      name,
      description,
      paymentAddress,
      remoteDatastores,
      giftCardIssuerIdentity,
      coreVersion: pkg.version,
      tablesByName: {},
      functionsByName: {},
      crawlersByName: {},
    };

    for (const [funcName, func] of Object.entries(this.functions)) {
      const passThrough = func as unknown as PassthroughFunction<any, any>;
      metadata.functionsByName[funcName] = {
        name: func.name,
        description: func.description,
        corePlugins: func.corePlugins ?? {},
        schema: func.schema,
        pricePerQuery: func.pricePerQuery,
        addOnPricing: func.addOnPricing,
        minimumPrice: func.minimumPrice,
        remoteSource: passThrough?.remoteSource,
        remoteFunction: passThrough?.remoteFunction,
        remoteDatastoreVersionHash: passThrough?.datastoreVersionHash,
      };
    }

    for (const [crawlerName, crawler] of Object.entries(this.crawlers)) {
      metadata.crawlersByName[crawlerName] = {
        name: crawler.name,
        description: crawler.description,
        corePlugins: crawler.corePlugins ?? {},
        schema: crawler.schema,
        pricePerQuery: crawler.pricePerQuery,
        addOnPricing: crawler.addOnPricing,
        minimumPrice: crawler.minimumPrice,
      };
    }

    for (const [funcName, table] of Object.entries(this.tables ?? {})) {
      if (!table.isPublic) continue;
      const passThrough = table as unknown as PassthroughTable<any, any>;
      metadata.tablesByName[funcName] = {
        name: table.name,
        description: table.description,
        schema: table.schema,
        remoteSource: passThrough?.remoteSource,
        remoteTable: passThrough?.remoteTable,
        remoteDatastoreVersionHash: passThrough?.datastoreVersionHash,
      };
    }

    return metadata;
  }
}
