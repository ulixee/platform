import { IDatastoreApiTypes } from '@ulixee/specification/datastore';
import { ExtractSchemaType } from '@ulixee/schema';
import IFunctionSchema from '../interfaces/IFunctionSchema';
import FunctionInternal from './FunctionInternal';
import IFunctionContext from '../interfaces/IFunctionContext';
import DatastoreInternal from './DatastoreInternal';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';
import ResultIterable from './ResultIterable';
import Table from './Table';
import Function from './Function';
import Crawler from './Crawler';
import ICrawlerOutputSchema from '../interfaces/ICrawlerOutputSchema';
import IFunctionExecOptions from '../interfaces/IFunctionExecOptions';

export default class FunctionContext<
  ISchema extends IFunctionSchema,
  TFunctionInternal extends FunctionInternal<ISchema> = FunctionInternal<ISchema>,
> implements IFunctionContext<ISchema>
{
  public datastoreMetadata: IDatastoreMetadata;
  public datastoreAffiliateId: string;
  public callerAffiliateId: string;
  public extraOptions: Record<string, any>;

  public get authentication(): IDatastoreApiTypes['Datastore.query']['args']['authentication'] {
    return this.#functionInternal.options.authentication;
  }

  public get payment(): IDatastoreApiTypes['Datastore.query']['args']['payment'] {
    return this.#functionInternal.options.payment;
  }

  public get input(): TFunctionInternal['input'] {
    return this.#functionInternal.input;
  }

  public get outputs(): TFunctionInternal['outputs'] {
    return this.#functionInternal.outputs;
  }

  public get Output(): TFunctionInternal['Output'] {
    return this.#functionInternal.Output;
  }

  public get schema(): ISchema {
    return this.#functionInternal.schema;
  }

  #functionInternal: FunctionInternal<ISchema>;
  #datastoreInternal: DatastoreInternal;

  constructor(functionInternal: FunctionInternal<ISchema>, datastoreInternal: DatastoreInternal) {
    this.#functionInternal = functionInternal;
    const { affiliateId, payment, input, authentication, isFromCommandLine, ...otherOptions } =
      functionInternal.options;
    this.extraOptions = otherOptions;
    this.datastoreMetadata = datastoreInternal.metadata;
    this.datastoreAffiliateId = datastoreInternal.affiliateId;
    this.callerAffiliateId = functionInternal.options.affiliateId;
  }

  public fetch<T extends Function>(
    func: T,
    options: T['runArgsType'],
  ): ResultIterable<ExtractSchemaType<T['schema']['output']>>;
  public fetch<T extends Table>(
    table: T,
    options: any,
  ): ResultIterable<ExtractSchemaType<T['schema']>>;
  public fetch(funcOrTable, options): any {
    const finalOptions = this.getMergedOptions(options);
    return funcOrTable.runInternal(finalOptions);
  }

  public async crawl<T extends Crawler>(
    crawler: T,
    options: T['runArgsType'] = {},
  ): Promise<ICrawlerOutputSchema> {
    const finalOptions = this.getMergedOptions(options);
    const [crawl] = await crawler.runInternal(finalOptions);
    return crawl;
  }

  public query<TResult>(sql: string, boundValues: any[]): Promise<TResult> {
    // const finalOptions = this.#functionInternal.options;
    return this.#datastoreInternal.queryInternal(sql, boundValues);
  }

  public run<T extends Function>(
    func: T,
    options: T['runArgsType'],
  ): ResultIterable<ExtractSchemaType<T['schema']['output']>> {
    const finalOptions = this.getMergedOptions(options);
    return func.runInternal(finalOptions) as any;
  }

  private getMergedOptions<T extends IFunctionExecOptions<any>>(options: T): T {
    const finalOptions = { ...this.#functionInternal.options, ...options };
    if (options.input) {
      // merge input
      finalOptions.input = { ...this.#functionInternal.input, ...options.input };
    }
    return finalOptions;
  }
}
