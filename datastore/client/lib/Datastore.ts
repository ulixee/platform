import IDatastoreManifest from '@ulixee/specification/types/IDatastoreManifest';
import { SqlParser } from '@ulixee/sql-engine';
import { ExtractSchemaType } from '@ulixee/schema';
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

    this.disableAutorun = Boolean(
      JSON.parse(process.env.ULX_DATASTORE_DISABLE_AUTORUN?.toLowerCase() ?? 'false'),
    );
  }

  public stream<T extends keyof TFunction>(
    name: T,
    input: ExtractSchemaType<TFunction[T]['schema']['input']> = {} as any,
  ): ResultIterable<ExtractSchemaType<TFunction[T]['schema']['output']>> {
    return this.#datastoreInternal.functions[name].stream({ input });
  }

  public async crawl<T extends keyof TComponents['crawlers']>(
    name: T,
    input: ExtractSchemaType<TComponents['crawlers'][T]['schema']['input']>,
  ): Promise<ICrawlerOutputSchema> {
    const [crawlResult] = await this.#datastoreInternal.crawlers[name].stream({ input });
    return crawlResult;
  }

  public async query<TResultType = any>(
    sql: string,
    boundValues: any[] = [],
  ): Promise<TResultType> {
    await this.#datastoreInternal.ensureDatabaseExists();
    const datastoreInstanceId = this.#datastoreInternal.instanceId;
    const datastoreVersionHash = this.#datastoreInternal.manifest?.versionHash;

    const sqlParser = new SqlParser(sql);
    const schemas = Object.keys(this.#datastoreInternal.functions).reduce((obj, k) => {
      return Object.assign(obj, { [k]: this.#datastoreInternal.functions[k].schema.input });
    }, {});
    const inputByFunctionName = sqlParser.extractFunctionInputs(schemas, boundValues);
    const outputByFunctionName: { [name: string]: any[] } = {};

    for (const functionName of Object.keys(inputByFunctionName)) {
      const input = inputByFunctionName[functionName];
      const output = await this.#datastoreInternal.functions[functionName].stream({ input });
      outputByFunctionName[functionName] = Array.isArray(output) ? output : [output];
    }

    const args = {
      sql,
      boundValues,
      inputByFunctionName,
      outputByFunctionName,
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
  ): void {
    this.#datastoreInternal.manifest = manifest;
    this.#datastoreInternal.connectionToCore = connectionToCore;
  }
}
