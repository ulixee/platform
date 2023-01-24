import ICoreResponsePayload from '@ulixee/net/interfaces/ICoreResponsePayload';
import IDatastoreManifest from '@ulixee/specification/types/IDatastoreManifest';
import { IDatastoreApis } from '@ulixee/specification/datastore';
import { IApiSpec } from '@ulixee/net/interfaces/IApiHandlers';
import IUnixTime from '@ulixee/net/interfaces/IUnixTime';
import { ISchemaAny } from '@ulixee/schema';
import { SqlParser } from '@ulixee/sql-engine';
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
import CreditsTable from './CreditsTable';
import DatastoreApiClient from './DatastoreApiClient';

const pkg = require('../package.json');

let lastInstanceId = 0;

export default class DatastoreInternal<
  TTable extends TTables = TTables,
  TFunction extends TFunctions = TFunctions,
  TCrawler extends TCrawlers = TCrawlers,
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
  public readonly affiliateId: string;

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

    const names: Set<string> = new Set();
    for (const [name, func] of Object.entries(components.functions || [])) {
      if (names.has(name)) {
        throw new Error(`${name} already exists in this datastore`);
      }
      this.attachFunction(func, name);
      names.add(name);
    }
    for (const [name, table] of Object.entries(components.tables || [])) {
      if (names.has(name)) {
        throw new Error(`${name} already exists in this datastore`);
      }
      this.attachTable(table, name);
      names.add(name);
    }
    this.attachTable(new CreditsTable());

    for (const [name, crawler] of Object.entries(components.crawlers || [])) {
      if (names.has(name)) {
        throw new Error(`${name} already exists in this datastore`);
      }
      this.attachCrawler(crawler, name);
      names.add(name);
    }

    this.affiliateId = components.affiliateId;
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

  public async queryInternal<TResultType = any>(
    sql: string,
    boundValues: any[] = [],
  ): Promise<TResultType> {
    await this.ensureDatabaseExists();
    const datastoreInstanceId = this.instanceId;
    const datastoreVersionHash = this.manifest?.versionHash;

    const sqlParser = new SqlParser(sql);
    const inputSchemas: { [functionName: string]: ISchemaAny } = {};
    for (const [key, func] of Object.entries(this.functions)) {
      if (func.schema) inputSchemas[key] = func.schema.input;
    }
    const inputByFunctionName = sqlParser.extractFunctionInputs(inputSchemas, boundValues);
    const outputByFunctionName: { [name: string]: any[] } = {};

    for (const functionName of Object.keys(inputByFunctionName)) {
      const input = inputByFunctionName[functionName];
      outputByFunctionName[functionName] = await this.functions[functionName].runInternal({
        input,
      });
    }

    const recordsByVirtualTableName: { [name: string]: Record<string, any>[] } = {};
    for (const tableName of sqlParser.tableNames) {
      if (!(this.tables[tableName] as PassthroughTable<any, any>).remoteSource) continue;

      const sqlInputs = sqlParser.extractTableQuery(tableName, boundValues);
      recordsByVirtualTableName[tableName] = await this.tables[tableName].queryInternal(
        sqlInputs.sql,
        sqlInputs.args,
      );
    }

    const args = {
      sql,
      boundValues,
      inputByFunctionName,
      outputByFunctionName,
      recordsByVirtualTableName,
      datastoreInstanceId,
      datastoreVersionHash,
    };
    return await this.sendRequest({
      command: 'Datastore.queryInternal',
      args: [args],
    });
  }

  public createApiClient(host: string): DatastoreApiClient {
    return new DatastoreApiClient(host);
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
    const {
      name,
      description,
      domain,
      paymentAddress,
      affiliateId,
      remoteDatastores,
      remoteDatastoreEmbeddedCredits,
      adminIdentities,
    } = this.components;

    const metadata: IDatastoreMetadata = {
      name,
      description,
      domain,
      affiliateId,
      paymentAddress,
      remoteDatastores,
      remoteDatastoreEmbeddedCredits,
      adminIdentities,
      coreVersion: pkg.version,
      tablesByName: {},
      functionsByName: {},
      crawlersByName: {},
    };
    metadata.remoteDatastoreEmbeddedCredits ??= {};

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
      const passThrough = table as unknown as PassthroughTable<any, any>;
      metadata.tablesByName[funcName] = {
        name: table.name,
        description: table.description,
        isPublic: table.isPublic !== false,
        schema: table.schema,
        remoteSource: passThrough?.remoteSource,
        remoteTable: passThrough?.remoteTable,
        remoteDatastoreVersionHash: passThrough?.datastoreVersionHash,
      };
    }

    return metadata;
  }
}