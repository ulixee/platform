import IDatastoreManifest from '@ulixee/specification/types/IDatastoreManifest';
import { SqlParser } from '@ulixee/sql-engine';
import { ExtractSchemaType, ISchemaAny } from '@ulixee/schema';
import ConnectionToDatastoreCore from '../connections/ConnectionToDatastoreCore';
import IDatastoreComponents, {
  TCrawlers,
  TFunctions,
  TTables,
} from '../interfaces/IDatastoreComponents';
import DatastoreInternal from './DatastoreInternal';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';
import ResultIterable from './ResultIterable';
import ICrawlerOutputSchema from '../interfaces/ICrawlerOutputSchema';
import DatastoreApiClient from './DatastoreApiClient';

export default class Datastore<
  TTable extends TTables = TTables,
  TFunction extends TFunctions = TFunctions,
  TCrawler extends TCrawlers = TCrawlers,
  TComponents extends IDatastoreComponents<TTable, TFunction, TCrawler> = IDatastoreComponents<
    TTable,
    TFunction,
    TCrawler
  >,
> {
  #datastoreInternal: DatastoreInternal<TTable, TFunction, TCrawler, TComponents>;

  public disableAutorun: boolean;

  public get affiliateId(): string {
    return this.#datastoreInternal.affiliateId;
  }

  public get metadata(): IDatastoreMetadata {
    return this.#datastoreInternal.metadata;
  }

  public get functions(): TComponents['functions'] {
    return this.#datastoreInternal.functions;
  }

  public get tables(): TComponents['tables'] {
    return this.#datastoreInternal.tables;
  }

  public get crawlers(): TComponents['crawlers'] {
    return this.#datastoreInternal.crawlers;
  }

  public get authenticateIdentity(): TComponents['authenticateIdentity'] {
    return this.#datastoreInternal.components.authenticateIdentity;
  }

  constructor(
    components: TComponents,
    datastoreInternal?: DatastoreInternal<TTable, TFunction, TCrawler, TComponents>,
  ) {
    this.#datastoreInternal = datastoreInternal ?? new DatastoreInternal(components);

    this.disableAutorun ??= Boolean(
      JSON.parse(process.env.ULX_DATASTORE_DISABLE_AUTORUN?.toLowerCase() ?? 'false'),
    );
  }

  public stream<T extends keyof TFunction>(
    name: T,
    input: ExtractSchemaType<TFunction[T]['schema']['input']> = {} as any,
  ): ResultIterable<ExtractSchemaType<TFunction[T]['schema']['output']>> {
    return this.#datastoreInternal.functions[name].stream({
      input,
      affiliateId: this.#datastoreInternal.affiliateId,
    });
  }

  public async crawl<T extends keyof TComponents['crawlers']>(
    name: T,
    input: ExtractSchemaType<TComponents['crawlers'][T]['schema']['input']>,
  ): Promise<ICrawlerOutputSchema> {
    return await this.#datastoreInternal.crawlers[name].crawl({
      input,
      affiliateId: this.#datastoreInternal.affiliateId,
    });
  }

  public async query<TResultType = any>(
    sql: string,
    boundValues: any[] = [],
  ): Promise<TResultType> {
    await this.#datastoreInternal.ensureDatabaseExists();
    const datastoreInstanceId = this.#datastoreInternal.instanceId;
    const datastoreVersionHash = this.#datastoreInternal.manifest?.versionHash;

    const sqlParser = new SqlParser(sql);
    const inputSchemas: { [functionName: string]: ISchemaAny } = {};
    for (const [key, func] of Object.entries(this.functions)) {
      if (func.schema) inputSchemas[key] = func.schema.input;
    }
    const inputByFunctionName = sqlParser.extractFunctionInputs(inputSchemas, boundValues);
    const outputByFunctionName: { [name: string]: any[] } = {};

    for (const functionName of Object.keys(inputByFunctionName)) {
      const input = inputByFunctionName[functionName];
      outputByFunctionName[functionName] = await this.functions[functionName].stream({ input });
    }

    const recordsByVirtualTableName: { [name: string]: Record<string, any>[] } = {};
    for (const tableName of sqlParser.tableNames) {
      if (!this.#datastoreInternal.metadata.tablesByName[tableName].remoteSource) continue;

      const sqlInputs = sqlParser.extractTableQuery(tableName, boundValues);
      recordsByVirtualTableName[tableName] = await this.tables[tableName].query(
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
    return await this.#datastoreInternal.sendRequest({
      command: 'Datastore.queryInternal',
      args: [args],
    });
  }

  public addConnectionToDatastoreCore(
    connectionToCore: ConnectionToDatastoreCore,
    manifest?: IDatastoreManifest,
    apiClientLoader?: (url: string) => DatastoreApiClient,
  ): void {
    this.#datastoreInternal.manifest = manifest;
    this.#datastoreInternal.connectionToCore = connectionToCore;
    if (apiClientLoader) this.#datastoreInternal.createApiClient = apiClientLoader;
  }
}
