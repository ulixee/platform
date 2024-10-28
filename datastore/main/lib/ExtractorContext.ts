import { IPayment } from '@ulixee/platform-specification';
import {
  IDatastoreQueryMetadata,
  IDatastoreQueryResult,
} from '@ulixee/platform-specification/datastore/DatastoreApis';
import { ExtractSchemaType } from '@ulixee/schema';
import ICrawlerOutputSchema from '../interfaces/ICrawlerOutputSchema';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';
import IExtractorContext from '../interfaces/IExtractorContext';
import IExtractorRunOptions from '../interfaces/IExtractorRunOptions';
import IExtractorSchema from '../interfaces/IExtractorSchema';
import IQueryOptions from '../interfaces/IQueryOptions';
import Crawler from './Crawler';
import DatastoreInternal, { IQueryInternalCallbacks } from './DatastoreInternal';
import Extractor from './Extractor';
import ExtractorInternal from './ExtractorInternal';
import ResultIterable from './ResultIterable';
import Table from './Table';

export default class ExtractorContext<
  ISchema extends IExtractorSchema,
  TExtractorInternal extends ExtractorInternal<ISchema> = ExtractorInternal<ISchema>,
> implements IExtractorContext<ISchema>
{
  public datastoreMetadata: IDatastoreMetadata;
  public datastoreAffiliateId: string;
  public callerAffiliateId: string;
  public extraOptions: Record<string, any>;

  public get authentication(): IDatastoreQueryMetadata['authentication'] {
    return this.#extractorInternal.options.authentication;
  }

  public get queryId(): string {
    return this.#extractorInternal.options.queryId;
  }

  public get payment(): IPayment {
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

  public get onQueryResult(): (result: IDatastoreQueryResult) => Promise<any> | void {
    return this.#extractorInternal.options.onQueryResult;
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
      return extractorOrTable.runInternal(finalOptions, this.#callbacks);
    }
    return extractorOrTable.fetchInternal(options, this.#callbacks);
  }

  public async crawl<T extends Crawler>(
    crawler: T,
    options: T['runArgsType'] = {},
  ): Promise<ICrawlerOutputSchema> {
    const finalOptions = this.getMergedOptions(options);
    return (await crawler.runInternal(finalOptions, this.#callbacks)).shift();
  }

  public query<TResult>(sql: string, boundValues: any[], options: IQueryOptions): Promise<TResult> {
    return this.#datastoreInternal.queryInternal(sql, boundValues, options, this.#callbacks);
  }

  private getMergedOptions<T extends IExtractorRunOptions<any>>(options: T): T {
    const finalOptions = { ...this.#extractorInternal.options, ...options };
    finalOptions.trackMetadata = options.trackMetadata;
    if (
      options.input &&
      typeof options.input === 'object' &&
      this.#extractorInternal.input &&
      typeof this.#extractorInternal.input === 'object'
    ) {
      // merge input
      finalOptions.input = {
        ...this.#extractorInternal.input,
        ...options.input,
      };
    }
    return finalOptions;
  }
}
