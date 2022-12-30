import ICoreResponsePayload from '@ulixee/net/interfaces/ICoreResponsePayload';
import IDataboxManifest from '@ulixee/specification/types/IDataboxManifest';
import { IDataboxApis } from '@ulixee/specification/databox';
import { IApiSpec } from '@ulixee/net/interfaces/IApiHandlers';
import IUnixTime from '@ulixee/net/interfaces/IUnixTime';
import ConnectionFactory from '../connections/ConnectionFactory';
import ConnectionToDataboxCore from '../connections/ConnectionToDataboxCore';
import IDataboxComponents, {
  TCrawlers,
  TFunctions,
  TTables,
} from '../interfaces/IDataboxComponents';
import Function from './Function';
import Table from './Table';
import type Crawler from './Crawler';
import IDataboxMetadata from '../interfaces/IDataboxMetadata';
import type PassthroughFunction from './PassthroughFunction';

const pkg = require('../package.json');

let lastInstanceId = 0;

export default class DataboxInternal<
  TTable extends TTables<any> = TTables<any>,
  TFunction extends TFunctions<any> = TFunctions<any>,
  TCrawler extends TCrawlers<any> = TCrawlers<any>,
  TComponents extends IDataboxComponents<TTable, TFunction, TCrawler> = IDataboxComponents<
    TTable,
    TFunction,
    TCrawler
  >,
> {
  #connectionToCore: ConnectionToDataboxCore;
  #isClosingPromise: Promise<void>;
  #createInMemoryDatabaseCallbacks: (() => void)[] = [];
  #createInMemoryDatabasePromise: Promise<void>;

  public manifest: IDataboxManifest;
  public readonly metadata: IDataboxMetadata;
  public instanceId: string;
  public loadingPromises: PromiseLike<void>[] = [];
  public components: TComponents;
  public readonly functions: TFunction = {} as any;
  public readonly tables: TTable = {} as any;
  public readonly crawlers: TCrawler = {} as any;

  public get remoteDataboxes(): TComponents['remoteDataboxes'] {
    return this.components.remoteDataboxes;
  }

  public get authenticateIdentity(): TComponents['authenticateIdentity'] {
    return this.components.authenticateIdentity;
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
    isAlreadyAttachedToDatabox?: boolean,
  ): void {
    const isFunction = func instanceof Function;
    const name = nameOverride || func.name;
    if (!name) throw new Error(`Function requires a name`);
    if (!isFunction) throw new Error(`${name} must be an instance of Function`);
    if (this.functions[name]) throw new Error(`Function already exists with name: ${name}`);

    if (!isAlreadyAttachedToDatabox) func.attachToDatabox(this, name);
    (this.functions as any)[name] = func;
  }

  public attachCrawler(
    crawler: Crawler,
    nameOverride?: string,
    isAlreadyAttachedToDatabox?: boolean,
  ): void {
    // NOTE: can't check instanceof Crawler because it creates a dependency loop
    const isCrawler = crawler instanceof Function && crawler.functionType === 'crawler';
    const name = nameOverride || crawler.name;
    if (!name) throw new Error(`Crawler requires a name`);
    if (!isCrawler) throw new Error(`${name} must be an instance of Crawler`);
    if (this.crawlers[name]) throw new Error(`Crawler already exists with name: ${name}`);

    if (!isAlreadyAttachedToDatabox) crawler.attachToDatabox(this, name);
    (this.crawlers as any)[name] = crawler;
  }

  public attachTable(
    table: Table,
    nameOverride?: string,
    isAlreadyAttachedToDatabox?: boolean,
  ): void {
    const isTable = table instanceof Table;
    const name = nameOverride || table.name;
    if (!name) throw new Error(`Table requires a name`);
    if (!isTable) throw new Error(`${name || 'table'} must be an instance of Table`);
    if (this.tables[name]) throw new Error(`Table already exists with name: ${name}`);

    if (!isAlreadyAttachedToDatabox) table.attachToDatabox(this, name);
    (this.tables as any)[name] = table;
  }

  private createMetadata(): IDataboxMetadata {
    const { paymentAddress, giftCardIssuerIdentity, remoteDataboxes } = this.components;

    const metadata = {
      paymentAddress,
      remoteDataboxes,
      giftCardIssuerIdentity,
      coreVersion: pkg.version,
      tablesByName: {},
      functionsByName: {},
      crawlersByName: {},
    };

    for (const [name, func] of Object.entries(this.functions)) {
      const passThrough = func as unknown as PassthroughFunction<any, any>;
      metadata.functionsByName[name] = {
        corePlugins: func.corePlugins ?? {},
        schema: func.schema,
        pricePerQuery: func.pricePerQuery,
        addOnPricing: func.addOnPricing,
        minimumPrice: func.minimumPrice,
        remoteSource: passThrough?.remoteSource,
        remoteFunction: passThrough?.remoteFunction,
        remoteDataboxVersionHash: passThrough?.databoxVersionHash,
      };
    }

    for (const [name, func] of Object.entries(this.crawlers)) {
      const passThrough = func as unknown as PassthroughFunction<any, any>;
      metadata.crawlersByName[name] = {
        corePlugins: func.corePlugins ?? {},
        schema: func.schema,
        pricePerQuery: func.pricePerQuery,
        addOnPricing: func.addOnPricing,
        minimumPrice: func.minimumPrice,
        remoteSource: passThrough?.remoteSource,
        remoteFunction: passThrough?.remoteFunction,
        remoteDataboxVersionHash: passThrough?.databoxVersionHash,
      };
    }

    for (const [name, table] of Object.entries(this.tables ?? {})) {
      metadata.tablesByName[name] = {
        schema: table.schema,
      };
    }

    return metadata;
  }
}
