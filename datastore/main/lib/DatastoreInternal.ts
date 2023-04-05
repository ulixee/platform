import ICoreResponsePayload from '@ulixee/net/interfaces/ICoreResponsePayload';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import { IDatastoreApis } from '@ulixee/platform-specification/datastore';
import { IApiSpec } from '@ulixee/net/interfaces/IApiHandlers';
import { Database as SqliteDatabase } from 'better-sqlite3';
import IUnixTime from '@ulixee/net/interfaces/IUnixTime';
import { ISchemaAny } from '@ulixee/schema';
import { SqlParser } from '@ulixee/sql-engine';
import ConnectionFactory from '../connections/ConnectionFactory';
import ConnectionToDatastoreCore from '../connections/ConnectionToDatastoreCore';
import IDatastoreComponents, {
  TCrawlers,
  TRunners,
  TTables,
} from '../interfaces/IDatastoreComponents';
import Runner from './Runner';
import Table from './Table';
import type Crawler from './Crawler';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';
import type PassthroughRunner from './PassthroughRunner';
import PassthroughTable, { IPassthroughQueryRunOptions } from './PassthroughTable';
import CreditsTable from './CreditsTable';
import DatastoreApiClient from './DatastoreApiClient';
import DatastoreStorage from './DatastoreStorage';
import SqlQuery from './SqlQuery';
import IRunnerExecOptions from '../interfaces/IRunnerExecOptions';

const pkg = require('../package.json');

let lastInstanceId = 0;

export default class DatastoreInternal<
  TTable extends TTables = TTables,
  TRunner extends TRunners = TRunners,
  TCrawler extends TCrawlers = TCrawlers,
  TComponents extends IDatastoreComponents<TTable, TRunner, TCrawler> = IDatastoreComponents<
    TTable,
    TRunner,
    TCrawler
  >,
> {
  #connectionToCore: ConnectionToDatastoreCore;
  #isClosingPromise: Promise<void>;

  public storage: DatastoreStorage;
  public manifest: IDatastoreManifest;
  public readonly metadata: IDatastoreMetadata;
  public instanceId: string;
  public loadingPromises: PromiseLike<void>[] = [];
  public components: TComponents;
  public readonly runners: TRunner = {} as any;
  public readonly tables: TTable = {} as any;
  public readonly crawlers: TCrawler = {} as any;
  public readonly affiliateId: string;

  public get db(): SqliteDatabase {
    return this.storage.db;
  }

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
    for (const [name, runner] of Object.entries(components.runners || [])) {
      if (names.has(name)) {
        throw new Error(`${name} already exists in this datastore`);
      }
      this.attachRunner(runner, name);
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

  public bind(config: IDatastoreBinding): DatastoreInternal {
    const { manifest, datastoreStorage, connectionToCore, apiClientLoader } = config;
    this.manifest = manifest;
    this.storage = datastoreStorage ?? new DatastoreStorage();
    this.storage.open(this);
    this.connectionToCore = connectionToCore;
    if (apiClientLoader) this.createApiClient = apiClientLoader;
    return this;
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

  public async queryInternal<TResultType = any[]>(
    sql: string,
    boundValues: any[] = [],
    queryId?: string,
    callbacks: IQueryInternalCallbacks = {},
  ): Promise<TResultType> {
    const sqlParser = new SqlParser(sql);
    const inputSchemas: { [runnerName: string]: ISchemaAny } = {};
    for (const [key, runner] of Object.entries(this.runners)) {
      if (runner.schema) inputSchemas[key] = runner.schema.input;
    }
    const inputByFunctionName = sqlParser.extractFunctionCallInputs(inputSchemas, boundValues);
    const outputByFunctionName: { [name: string]: any[] } = {};

    const functionCallsById = Object.keys(inputByFunctionName).map((x, i) => {
      return {
        name: x,
        id: i,
      };
    });

    if (callbacks.beforeAll) {
      await callbacks.beforeAll({ sqlParser, functionCallsById });
    }

    for (const { name, id } of functionCallsById) {
      const input = inputByFunctionName[name];
      const func = this.runners[name] ?? this.crawlers[name];
      callbacks.onFunction ??= (_, __, options, run) => run(options);
      outputByFunctionName[name] = await callbacks.onFunction(
        id,
        name,
        { input, id: queryId },
        options => func.runInternal(options, callbacks),
      );
    }

    const recordsByVirtualTableName: { [name: string]: Record<string, any>[] } = {};
    for (const tableName of sqlParser.tableNames) {
      if (!this.storage.isVirtualTable(tableName)) continue;

      const sqlInputs = sqlParser.extractTableQuery(tableName, boundValues);
      callbacks.onPassthroughTable ??= (_, options, run) => run(options);
      recordsByVirtualTableName[tableName] = await callbacks.onPassthroughTable(
        tableName,
        {
          id: queryId,
        },
        options => this.tables[tableName].queryInternal(sqlInputs.sql, sqlInputs.args, options),
      );
    }

    const db = this.db;
    sql = sqlParser.toSql();
    const queryBoundValues = sqlParser.convertToBoundValuesSqliteMap(boundValues);

    if (sqlParser.isInsert() || sqlParser.isUpdate() || sqlParser.isDelete()) {
      if (sqlParser.hasReturn()) {
        return db.prepare(sql).get(queryBoundValues);
      }
      const result = db.prepare(sql).run(queryBoundValues);
      return { changes: result?.changes } as any;
    }

    if (!sqlParser.isSelect()) throw new Error('Invalid SQL command');

    const sqlQuery = new SqlQuery(sqlParser, this.storage);
    return sqlQuery.execute(
      inputByFunctionName,
      outputByFunctionName,
      recordsByVirtualTableName,
      queryBoundValues,
    );
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

  public attachRunner(
    runner: Runner,
    nameOverride?: string,
    isAlreadyAttachedToDatastore?: boolean,
  ): void {
    const isRunner = runner instanceof Runner;
    const name = nameOverride || runner.name;
    if (!name) throw new Error(`Runner requires a name`);
    if (!isRunner) throw new Error(`${name} must be an instance of Runner`);
    if (this.runners[name]) throw new Error(`Runner already exists with name: ${name}`);

    if (!isAlreadyAttachedToDatastore) runner.attachToDatastore(this, name);
    (this.runners as any)[name] = runner;
  }

  public attachCrawler(
    crawler: Crawler,
    nameOverride?: string,
    isAlreadyAttachedToDatastore?: boolean,
  ): void {
    // NOTE: can't check instanceof Crawler because it creates a dependency loop
    const isCrawler = crawler instanceof Runner && crawler.runnerType === 'crawler';
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
      runnersByName: {},
      crawlersByName: {},
    };
    metadata.remoteDatastoreEmbeddedCredits ??= {};

    for (const [runnerName, runner] of Object.entries(this.runners)) {
      const passThrough = runner as unknown as PassthroughRunner<any, any>;
      metadata.runnersByName[runnerName] = {
        name: runner.name,
        description: runner.description,
        corePlugins: runner.corePlugins ?? {},
        schema: runner.schema,
        pricePerQuery: runner.pricePerQuery,
        addOnPricing: runner.addOnPricing,
        minimumPrice: runner.minimumPrice,
        remoteSource: passThrough?.remoteSource,
        remoteRunner: passThrough?.remoteRunner,
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

    for (const [runnerName, table] of Object.entries(this.tables ?? {})) {
      const passThrough = table as unknown as PassthroughTable<any, any>;
      metadata.tablesByName[runnerName] = {
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

export interface IDatastoreBinding {
  connectionToCore?: ConnectionToDatastoreCore;
  datastoreStorage?: DatastoreStorage;
  manifest?: IDatastoreManifest;
  apiClientLoader?: (url: string) => DatastoreApiClient;
}

export interface IQueryInternalCallbacks {
  beforeAll?(args: {
    sqlParser: SqlParser;
    functionCallsById: { name: string; id: number }[];
  }): Promise<void>;
  onFunction?<TOutput = any[]>(
    id: number,
    name: string,
    options: IRunnerExecOptions<any>,
    run: (options: IRunnerExecOptions<any>) => Promise<TOutput>,
  ): Promise<TOutput>;
  onPassthroughTable?<TOutput = any[]>(
    name: string,
    options: IPassthroughQueryRunOptions,
    run: (options: IPassthroughQueryRunOptions) => Promise<TOutput>,
  ): Promise<TOutput>;
}
