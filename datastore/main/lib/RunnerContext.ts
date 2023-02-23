import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import { ExtractSchemaType } from '@ulixee/schema';
import IRunnerSchema from '../interfaces/IRunnerSchema';
import RunnerInternal from './RunnerInternal';
import IRunnerContext from '../interfaces/IRunnerContext';
import DatastoreInternal from './DatastoreInternal';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';
import ResultIterable from './ResultIterable';
import Table from './Table';
import Runner from './Runner';
import Crawler from './Crawler';
import ICrawlerOutputSchema from '../interfaces/ICrawlerOutputSchema';
import IRunnerExecOptions from '../interfaces/IRunnerExecOptions';

export default class RunnerContext<
  ISchema extends IRunnerSchema,
  TRunnerInternal extends RunnerInternal<ISchema> = RunnerInternal<ISchema>,
> implements IRunnerContext<ISchema>
{
  public datastoreMetadata: IDatastoreMetadata;
  public datastoreAffiliateId: string;
  public callerAffiliateId: string;
  public extraOptions: Record<string, any>;

  public get authentication(): IDatastoreApiTypes['Datastore.query']['args']['authentication'] {
    return this.#runnerInternal.options.authentication;
  }

  public get payment(): IDatastoreApiTypes['Datastore.query']['args']['payment'] {
    return this.#runnerInternal.options.payment;
  }

  public get input(): TRunnerInternal['input'] {
    return this.#runnerInternal.input;
  }

  public get outputs(): TRunnerInternal['outputs'] {
    return this.#runnerInternal.outputs;
  }

  public get Output(): TRunnerInternal['Output'] {
    return this.#runnerInternal.Output;
  }

  public get schema(): ISchema {
    return this.#runnerInternal.schema;
  }

  #runnerInternal: RunnerInternal<ISchema>;
  #datastoreInternal: DatastoreInternal;

  constructor(runnerInternal: RunnerInternal<ISchema>, datastoreInternal: DatastoreInternal) {
    this.#runnerInternal = runnerInternal;
    const { affiliateId, payment, input, authentication, isFromCommandLine, ...otherOptions } =
      runnerInternal.options;
    this.extraOptions = otherOptions;
    this.datastoreMetadata = datastoreInternal.metadata;
    this.datastoreAffiliateId = datastoreInternal.affiliateId;
    this.callerAffiliateId = runnerInternal.options.affiliateId;
  }

  public fetch<T extends Runner>(
    runner: T,
    options: T['runArgsType'],
  ): ResultIterable<ExtractSchemaType<T['schema']['output']>>;
  public fetch<T extends Table>(
    table: T,
    options: any,
  ): ResultIterable<ExtractSchemaType<T['schema']>>;
  public fetch(runnerOrTable, options): any {
    const finalOptions = this.getMergedOptions(options);
    return runnerOrTable.runInternal(finalOptions);
  }

  public run<T extends Runner>(
    runner: T,
    options: T['runArgsType'],
  ): ResultIterable<ExtractSchemaType<T['schema']['output']>>;
  public run<T extends Table>(
    table: T,
    options: any,
  ): ResultIterable<ExtractSchemaType<T['schema']>>;
  public run(runnerOrTable, options): any {
    const finalOptions = this.getMergedOptions(options);
    return runnerOrTable.runInternal(finalOptions) as any;
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
    // const finalOptions = this.#runnerInternal.options;
    return this.#datastoreInternal.queryInternal(sql, boundValues);
  }

  private getMergedOptions<T extends IRunnerExecOptions<any>>(options: T): T {
    const finalOptions = { ...this.#runnerInternal.options, ...options };
    if (options.input) {
      // merge input
      finalOptions.input = { ...this.#runnerInternal.input, ...options.input };
    }
    return finalOptions;
  }
}
