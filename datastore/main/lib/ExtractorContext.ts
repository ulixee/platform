import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import { ExtractSchemaType } from '@ulixee/schema';
import IExtractorSchema from '../interfaces/IExtractorSchema';
import ExtractorInternal from './ExtractorInternal';
import IExtractorContext from '../interfaces/IExtractorContext';
import DatastoreInternal, { IQueryInternalCallbacks } from './DatastoreInternal';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';
import ResultIterable from './ResultIterable';
import Table from './Table';
import Extractor from './Extractor';
import Crawler from './Crawler';
import ICrawlerOutputSchema from '../interfaces/ICrawlerOutputSchema';
import IExtractorRunOptions from '../interfaces/IExtractorRunOptions';
import { TQueryCallMeta } from '../interfaces/IStorageEngine';

export default class ExtractorContext<
  ISchema extends IExtractorSchema,
  TExtractorInternal extends ExtractorInternal<ISchema> = ExtractorInternal<ISchema>,
> implements IExtractorContext<ISchema>
{
  public datastoreMetadata: IDatastoreMetadata;
  public datastoreAffiliateId: string;
  public callerAffiliateId: string;
  public extraOptions: Record<string, any>;

  public get authentication(): IDatastoreApiTypes['Datastore.query']['args']['authentication'] {
    return this.#extractorInternal.options.authentication;
  }

  public get payment(): IDatastoreApiTypes['Datastore.query']['args']['payment'] {
    return this.#extractorInternal.options.payment;
  }

  public get input(): TExtractorInternal['input'] {
    return this.#extractorInternal.input;
  }

  public get outputs(): TExtractorInternal['outputs'] {
    return this.#extractorInternal.outputs;
  }

  public get Output(): TExtractorInternal['Output'] {
    return this.#extractorInternal.Output;
  }

  public get schema(): ISchema {
    return this.#extractorInternal.schema;
  }

  #extractorInternal: ExtractorInternal<ISchema>;
  #datastoreInternal: DatastoreInternal;
  #callbacks: IQueryInternalCallbacks;

  constructor(
    extractorInternal: ExtractorInternal<ISchema>,
    datastoreInternal: DatastoreInternal,
    callbacks?: IQueryInternalCallbacks,
  ) {
    this.#extractorInternal = extractorInternal;
    this.#callbacks = callbacks ?? {};
    this.#callbacks.onFunction ??= (_id, _name, options, run) => run(options);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { affiliateId, payment, input, authentication, ...otherOptions } =
      extractorInternal.options;
    this.extraOptions = otherOptions;
    this.datastoreMetadata = datastoreInternal.metadata;
    this.datastoreAffiliateId = datastoreInternal.affiliateId;
    this.callerAffiliateId = extractorInternal.options.affiliateId;
  }

  public fetch<T extends Extractor>(
    extractor: T,
    options: T['runArgsType'],
  ): ResultIterable<ExtractSchemaType<T['schema']['output']>>;
  public fetch<T extends Table>(
    table: T,
    options: any,
  ): ResultIterable<ExtractSchemaType<T['schema']>>;
  public fetch(extractorOrTable, options): any {
    return this.run(extractorOrTable, options);
  }

  public run<T extends Extractor>(
    extractor: T,
    options: T['runArgsType'],
  ): ResultIterable<ExtractSchemaType<T['schema']['output']>>;
  public run<T extends Table>(
    table: T,
    options: any,
  ): ResultIterable<ExtractSchemaType<T['schema']>>;
  public run(extractorOrTable, options): any {
    const finalOptions = this.getMergedOptions(options);
    if (extractorOrTable instanceof Extractor) {
      return this.#callbacks.onFunction(-1, extractorOrTable.name, finalOptions, modifiedOptions =>
        extractorOrTable.runInternal(modifiedOptions, this.#callbacks),
      );
    }
    if ('remoteSource' in extractorOrTable) {
      return this.#callbacks.onPassthroughTable(
        extractorOrTable.name,
        finalOptions,
        modifiedOptions => extractorOrTable.fetchInternal(modifiedOptions, this.#callbacks),
      );
    }

    return extractorOrTable.runInternal(finalOptions) as any;
  }

  public async crawl<T extends Crawler>(
    crawler: T,
    options: T['runArgsType'] = {},
  ): Promise<ICrawlerOutputSchema> {
    const finalOptions = this.getMergedOptions(options);
    const [crawl] = await this.#callbacks.onFunction(
      -1,
      crawler.name,
      finalOptions,
      modifiedOptions => crawler.runInternal(modifiedOptions, this.#callbacks),
    );
    return crawl;
  }

  public query<TResult>(
    sql: string,
    boundValues: any[],
    options: TQueryCallMeta,
  ): Promise<TResult> {
    return this.#datastoreInternal.queryInternal(sql, boundValues, options, this.#callbacks);
  }

  private getMergedOptions<T extends IExtractorRunOptions<any>>(options: T): T {
    const finalOptions = { ...this.#extractorInternal.options, ...options };
    finalOptions.trackMetadata = options.trackMetadata;
    if (options.input) {
      // merge input
      finalOptions.input = { ...this.#extractorInternal.input, ...options.input };
    }
    return finalOptions;
  }
}
