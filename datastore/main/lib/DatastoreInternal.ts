import { IApiSpec } from '@ulixee/net/interfaces/IApiHandlers';
import ICoreResponsePayload from '@ulixee/net/interfaces/ICoreResponsePayload';
import IUnixTime from '@ulixee/net/interfaces/IUnixTime';
import { IDatastoreApis } from '@ulixee/platform-specification/datastore';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import { ISchemaAny } from '@ulixee/schema';
import { SqlParser } from '@ulixee/sql-engine';
import ConnectionFactory from '../connections/ConnectionFactory';
import ConnectionToDatastoreCore from '../connections/ConnectionToDatastoreCore';
import IDatastoreComponents, {
  TCrawlers,
  TExtractors,
  TTables,
} from '../interfaces/IDatastoreComponents';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';
import IExtractorRunOptions from '../interfaces/IExtractorRunOptions';
import IStorageEngine, { TQueryCallMeta } from '../interfaces/IStorageEngine';
import SqliteStorageEngine from '../storage-engines/SqliteStorageEngine';
import type Crawler from './Crawler';
import CreditsTable from './CreditsTable';
import DatastoreApiClient from './DatastoreApiClient';
import Extractor from './Extractor';
import type PassthroughExtractor from './PassthroughExtractor';
import PassthroughTable, { IPassthroughQueryRunOptions } from './PassthroughTable';
import Table from './Table';

const pkg = require('../package.json');

let lastInstanceId = 0;

export default class DatastoreInternal<
  TTable extends TTables = TTables,
  TExtractor extends TExtractors = TExtractors,
  TCrawler extends TCrawlers = TCrawlers,
  TComponents extends IDatastoreComponents<TTable, TExtractor, TCrawler> = IDatastoreComponents<
    TTable,
    TExtractor,
    TCrawler
  >,
> {
  #connectionToCore: ConnectionToDatastoreCore;
  #isClosingPromise: Promise<void>;

  public storageEngine: IStorageEngine;
  public manifest: IDatastoreManifest;
  public readonly metadata: IDatastoreMetadata;
  public instanceId: string;
  public loadingPromises: PromiseLike<void>[] = [];
  public components: TComponents;
  public readonly extractors: TExtractor = {} as any;
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

  public get onCreated(): TComponents['onCreated'] {
    return this.components.onCreated;
  }

  public get onVersionMigrated(): TComponents['onVersionMigrated'] {
    return this.components.onVersionMigrated;
  }

  constructor(components: TComponents) {
    lastInstanceId++;
    this.instanceId = `${process.pid}-${lastInstanceId}`;
    this.components = components;

    const names: Set<string> = new Set();
    for (const [name, extractor] of Object.entries(components.extractors || [])) {
      if (names.has(name)) {
        throw new Error(`${name} already exists in this datastore`);
      }
      this.attachExtractor(extractor, name);
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

  public async bind(config: IDatastoreBinding): Promise<DatastoreInternal> {
    const { manifest, storageEngine, connectionToCore, apiClientLoader } = config ?? {};
    this.manifest = manifest;
    this.storageEngine = storageEngine;
    if (!this.storageEngine) {
      this.storageEngine = new SqliteStorageEngine();
      await this.storageEngine.create(this as any);
    }
    this.storageEngine.bind(this);
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
  ): Promise<ICoreResponsePayload<IDatastoreApis, T>['data']> {
    return this.connectionToCore.sendRequest(payload, timeoutMs);
  }

  public async queryInternal<TResultType = any[]>(
    sql: string,
    boundValues?: any[],
    options?: TQueryCallMeta,
    callbacks: IQueryInternalCallbacks = {},
  ): Promise<TResultType> {
    boundValues ??= [];
    const sqlParser = new SqlParser(sql);
    const inputSchemas: { [extractorName: string]: ISchemaAny } = {};
    for (const [key, extractor] of Object.entries(this.extractors)) {
      if (extractor.schema) inputSchemas[key] = extractor.schema.input;
    }
    for (const [key, crawler] of Object.entries(this.crawlers)) {
      if (crawler.schema) inputSchemas[key] = crawler.schema.input;
    }
    const inputByFunctionName = sqlParser.extractFunctionCallInputs(inputSchemas, boundValues);
    const virtualEntitiesByName: {
      [name: string]: { records: Record<string, any>[]; parameters?: Record<string, any> };
    } = {};

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
      const parameters = inputByFunctionName[name];
      virtualEntitiesByName[name] = { parameters, records: [] };
      const func = this.extractors[name] ?? this.crawlers[name];
      callbacks.onFunction ??= (_id, _name, opts, run) => run(opts);
      virtualEntitiesByName[name].records = await callbacks.onFunction(
        id,
        name,
        { ...options, input: parameters },
        opts => func.runInternal(opts, callbacks),
      );
    }

    for (const tableName of sqlParser.tableNames) {
      if (!this.storageEngine.virtualTableNames.has(tableName)) continue;

      virtualEntitiesByName[tableName] = { records: [] };

      const sqlInputs = sqlParser.extractTableQuery(tableName, boundValues);
      callbacks.onPassthroughTable ??= (_, opts, run) => run(opts);
      virtualEntitiesByName[tableName].records = await callbacks.onPassthroughTable(
        tableName,
        options,
        opts => this.tables[tableName].queryInternal(sqlInputs.sql, sqlInputs.args, opts),
      );
    }

    return await this.storageEngine.query(sqlParser, boundValues, options, virtualEntitiesByName);
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

  public attachExtractor(
    extractor: Extractor,
    nameOverride?: string,
    isAlreadyAttachedToDatastore?: boolean,
  ): void {
    const isExtractor = extractor instanceof Extractor;
    const name = nameOverride || extractor.name;
    if (!name) throw new Error(`Extractor requires a name`);
    if (!isExtractor) throw new Error(`${name} must be an instance of Extractor`);
    if (this.extractors[name]) throw new Error(`Extractor already exists with name: ${name}`);

    if (!isAlreadyAttachedToDatastore) extractor.attachToDatastore(this, name);
    (this.extractors as any)[name] = extractor;
  }

  public attachCrawler(
    crawler: Crawler,
    nameOverride?: string,
    isAlreadyAttachedToDatastore?: boolean,
  ): void {
    // NOTE: can't check instanceof Crawler because it creates a dependency loop
    const isCrawler = crawler instanceof Extractor && crawler.extractorType === 'crawler';
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
      version,
      id,
      name,
      description,
      domain,
      paymentAddress,
      affiliateId,
      remoteDatastores,
      remoteDatastoreEmbeddedCredits,
      adminIdentities,
      storageEngineHost,
    } = this.components;

    const metadata: IDatastoreMetadata = {
      version,
      id,
      name,
      description,
      domain,
      affiliateId,
      paymentAddress,
      remoteDatastores,
      remoteDatastoreEmbeddedCredits,
      adminIdentities,
      storageEngineHost,
      coreVersion: pkg.version,
      tablesByName: {},
      extractorsByName: {},
      crawlersByName: {},
    };
    metadata.remoteDatastoreEmbeddedCredits ??= {};

    for (const [extractorName, extractor] of Object.entries(this.extractors)) {
      const passThrough = extractor as unknown as PassthroughExtractor<any, any>;
      metadata.extractorsByName[extractorName] = {
        name: extractor.name,
        description: extractor.description,
        corePlugins: extractor.corePlugins ?? {},
        schema: extractor.schema,
        pricePerQuery: extractor.pricePerQuery,
        addOnPricing: extractor.addOnPricing,
        minimumPrice: extractor.minimumPrice,
        remoteSource: passThrough?.remoteSource,
        remoteExtractor: passThrough?.remoteExtractor,
        remoteDatastoreId: passThrough?.remoteDatastoreId,
        remoteDatastoreVersion: passThrough?.remoteVersion,
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

    for (const [extractorName, table] of Object.entries(this.tables ?? {})) {
      const passThrough = table as unknown as PassthroughTable<any, any>;
      metadata.tablesByName[extractorName] = {
        name: table.name,
        description: table.description,
        isPublic: table.isPublic !== false,
        schema: table.schema,
        remoteSource: passThrough?.remoteSource,
        remoteTable: passThrough?.remoteTable,
        remoteDatastoreId: passThrough?.remoteDatastoreId,
        remoteDatastoreVersion: passThrough?.remoteVersion,
      };
    }

    return metadata;
  }
}

export interface IDatastoreBinding {
  connectionToCore?: ConnectionToDatastoreCore;
  storageEngine?: IStorageEngine;
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
    options: IExtractorRunOptions<any>,
    run: (options: IExtractorRunOptions<any>) => Promise<TOutput>,
  ): Promise<TOutput>;
  onPassthroughTable?<TOutput = any[]>(
    name: string,
    options: IPassthroughQueryRunOptions,
    run: (options: IPassthroughQueryRunOptions) => Promise<TOutput>,
  ): Promise<TOutput>;
}
