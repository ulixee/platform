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
  TRunners,
  TTables,
} from '../interfaces/IDatastoreComponents';
import Runner from './Runner';
import Table from './Table';
import type Crawler from './Crawler';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';
import type PassthroughRunner from './PassthroughRunner';
import PassthroughTable from './PassthroughTable';
import CreditsTable from './CreditsTable';
import DatastoreApiClient from './DatastoreApiClient';

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
  #createInMemoryDatabaseCallbacks: (() => void)[] = [];
  #createInMemoryDatabasePromise: Promise<void>;

  public manifest: IDatastoreManifest;
  public readonly metadata: IDatastoreMetadata;
  public instanceId: string;
  public loadingPromises: PromiseLike<void>[] = [];
  public components: TComponents;
  public readonly runners: TRunner = {} as any;
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
    const inputSchemas: { [runnerName: string]: ISchemaAny } = {};
    for (const [key, runner] of Object.entries(this.runners)) {
      if (runner.schema) inputSchemas[key] = runner.schema.input;
    }
    const inputByRunnerName = sqlParser.extractRunnerInputs(inputSchemas, boundValues);
    const outputByRunnerName: { [name: string]: any[] } = {};

    for (const runnerName of Object.keys(inputByRunnerName)) {
      const input = inputByRunnerName[runnerName];
      outputByRunnerName[runnerName] = await this.runners[runnerName].runInternal({
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
      inputByRunnerName,
      outputByRunnerName,
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
