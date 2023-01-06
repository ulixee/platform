import IDataboxManifest from '@ulixee/specification/types/IDataboxManifest';
import { SqlParser } from '@ulixee/sql-engine';
import { ExtractSchemaType } from '@ulixee/schema';
import ConnectionToDataboxCore from '../connections/ConnectionToDataboxCore';
import IDataboxComponents, {
  TCrawlers,
  TFunctions,
  TTables,
} from '../interfaces/IDataboxComponents';
import DataboxInternal from './DataboxInternal';
import IDataboxMetadata from '../interfaces/IDataboxMetadata';
import ResultIterable from './ResultIterable';
import ICrawlerOutputSchema from '../interfaces/ICrawlerOutputSchema';

export default class Databox<
  TTable extends TTables = TTables,
  TFunction extends TFunctions = TFunctions,
  TCrawler extends TCrawlers = TCrawlers,
  TComponents extends IDataboxComponents<TTable, TFunction, TCrawler> = IDataboxComponents<
    TTable,
    TFunction,
    TCrawler
  >,
> {
  #databoxInternal: DataboxInternal<TTable, TFunction, TCrawler, TComponents>;

  public disableAutorun: boolean;

  public get metadata(): IDataboxMetadata {
    return this.#databoxInternal.metadata;
  }

  public get functions(): TComponents['functions'] {
    return this.#databoxInternal.functions;
  }

  public get tables(): TComponents['tables'] {
    return this.#databoxInternal.tables;
  }

  public get crawlers(): TComponents['crawlers'] {
    return this.#databoxInternal.crawlers;
  }

  public get authenticateIdentity(): TComponents['authenticateIdentity'] {
    return this.#databoxInternal.components.authenticateIdentity;
  }

  constructor(
    components: TComponents,
    databoxInternal?: DataboxInternal<TTable, TFunction, TCrawler, TComponents>,
  ) {
    this.#databoxInternal = databoxInternal ?? new DataboxInternal(components);

    this.disableAutorun = Boolean(
      JSON.parse(process.env.ULX_DATABOX_DISABLE_AUTORUN?.toLowerCase() ?? 'false'),
    );
  }

  public stream<T extends keyof TFunction>(
    name: T,
    input: ExtractSchemaType<TFunction[T]['schema']['input']> = {} as any,
  ): ResultIterable<ExtractSchemaType<TFunction[T]['schema']['output']>> {
    return this.#databoxInternal.functions[name].stream({ input });
  }

  public async crawl<T extends keyof TComponents['crawlers']>(
    name: T,
    input: ExtractSchemaType<TComponents['crawlers'][T]['schema']['input']>,
  ): Promise<ICrawlerOutputSchema> {
    const [crawlResult] = await this.#databoxInternal.crawlers[name].stream({ input });
    return crawlResult;
  }

  public async query<TResultType = any>(
    sql: string,
    boundValues: any[] = [],
  ): Promise<TResultType> {
    await this.#databoxInternal.ensureDatabaseExists();
    const databoxInstanceId = this.#databoxInternal.instanceId;
    const databoxVersionHash = this.#databoxInternal.manifest?.versionHash;

    const sqlParser = new SqlParser(sql);
    const schemas = Object.keys(this.#databoxInternal.functions).reduce((obj, k) => {
      return Object.assign(obj, { [k]: this.#databoxInternal.functions[k].schema.input });
    }, {});
    const inputByFunctionName = sqlParser.extractFunctionInputs(schemas, boundValues);
    const outputByFunctionName: { [name: string]: any[] } = {};

    for (const functionName of Object.keys(inputByFunctionName)) {
      const input = inputByFunctionName[functionName];
      const output = await this.#databoxInternal.functions[functionName].stream({ input });
      outputByFunctionName[functionName] = Array.isArray(output) ? output : [output];
    }

    const args = {
      sql,
      boundValues,
      inputByFunctionName,
      outputByFunctionName,
      databoxInstanceId,
      databoxVersionHash,
    };
    return await this.#databoxInternal.sendRequest({
      command: 'Databox.queryInternal',
      args: [args],
    });
  }

  public addConnectionToDataboxCore(
    connectionToCore: ConnectionToDataboxCore,
    manifest?: IDataboxManifest,
  ): void {
    this.#databoxInternal.manifest = manifest;
    this.#databoxInternal.connectionToCore = connectionToCore;
  }
}
