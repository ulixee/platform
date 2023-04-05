import * as assert from 'assert';
import { ExtractSchemaType } from '@ulixee/schema';
import Runner from './Runner';
import IRunnerSchema from '../interfaces/IRunnerSchema';
import IRunnerComponents from '../interfaces/IRunnerComponents';
import IRunnerContext from '../interfaces/IRunnerContext';
import DatastoreApiClient, { IDatastoreExecRelayArgs } from './DatastoreApiClient';
import { IRunnerPluginConstructor } from '../interfaces/IRunnerPluginStatics';
import ResultIterable from './ResultIterable';

export interface IPassthroughRunnerComponents<
  TRemoteSources extends Record<string, string>,
  TRunnerName extends string,
  TSchema extends IRunnerSchema = IRunnerSchema<any, any>,
  TContext extends IRunnerContext<TSchema> & IDatastoreExecRelayArgs = IRunnerContext<TSchema> &
    IDatastoreExecRelayArgs,
> {
  remoteRunner: `${keyof TRemoteSources & string}.${TRunnerName}`;
  upcharge?: number;
  onRequest?: (context: TContext) => Promise<any>;
  onResponse?: (
    context: TContext & { stream: AsyncIterable<ExtractSchemaType<TSchema['output']>> },
  ) => Promise<any>;
}

export default class PassthroughRunner<
  TRemoteSources extends Record<string, string>,
  TRunnerName extends string,
  TSchema extends IRunnerSchema = IRunnerSchema<any, any>,
  TPlugin1 extends IRunnerPluginConstructor<TSchema> = IRunnerPluginConstructor<TSchema>,
  TPlugin2 extends IRunnerPluginConstructor<TSchema> = IRunnerPluginConstructor<TSchema>,
  TPlugin3 extends IRunnerPluginConstructor<TSchema> = IRunnerPluginConstructor<TSchema>,
  TOutput extends ExtractSchemaType<TSchema['output']> = ExtractSchemaType<TSchema['output']>,
  TContext extends IRunnerContext<TSchema> & IDatastoreExecRelayArgs = IRunnerContext<TSchema> &
    TPlugin1['contextAddons'] &
    TPlugin2['contextAddons'] &
    TPlugin3['contextAddons'] &
    IDatastoreExecRelayArgs,
> extends Runner<TSchema, TPlugin1, TPlugin2, TPlugin3, TContext> {
  public readonly remoteSource: string;
  public readonly remoteRunner: string;
  public datastoreVersionHash: string;

  protected upstreamClient: DatastoreApiClient;
  protected readonly passThroughComponents: IPassthroughRunnerComponents<
    TRemoteSources,
    TRunnerName,
    TSchema,
    TContext
  >;

  constructor(
    components: Pick<IRunnerComponents<TSchema, TContext>, 'name' | 'description' | 'schema'> &
      IPassthroughRunnerComponents<TRemoteSources, TRunnerName> &
      TPlugin1['componentAddons'] &
      TPlugin2['componentAddons'] &
      TPlugin3['componentAddons'],
    ...plugins: [plugin1?: TPlugin1, plugin2?: TPlugin2, plugin3?: TPlugin3]
  ) {
    super({ ...components } as any, ...plugins);
    this.components.run = this.run.bind(this);
    this.pricePerQuery = components.upcharge ?? 0;
    this.minimumPrice = components.upcharge ?? 0;
    assert(components.remoteRunner, 'A remote runner name is required');
    assert(components.remoteRunner.includes('.'), 'A remote function source is required');
    this.passThroughComponents = components;
    const [source, remoteRunner] = components.remoteRunner.split('.');
    this.remoteRunner = remoteRunner;
    this.remoteSource = source;
  }

  protected async run(context: TContext): Promise<void> {
    this.createApiClient(context);

    if (this.passThroughComponents.onRequest) {
      await this.passThroughComponents.onRequest(context);
    }

    const payment = { ...(context.payment ?? {}) };
    const embeddedCredit =
      context.datastoreMetadata.remoteDatastoreEmbeddedCredits[this.remoteSource];
    if (embeddedCredit && payment.credits) {
      payment.credits = embeddedCredit;
    } else {
      // don't want to pass through credit secrets
      delete payment.credits;
    }

    const queryResult = this.upstreamClient.stream<{ output: TOutput; input: any }>(
      this.datastoreVersionHash,
      this.remoteRunner,
      context.input,
      {
        payment,
        authentication: context.authentication,
        affiliateId: context.datastoreAffiliateId,
      },
    );

    if (this.passThroughComponents.onResponse) {
      const secondPassResults = new ResultIterable<TOutput>();
      const responseContext: TContext & { stream: AsyncIterable<TOutput> } = context as any;
      responseContext.stream = secondPassResults;

      const onResponsePromiseOrError = this.passThroughComponents
        .onResponse(responseContext)
        .catch(err => err);

      try {
        for await (const result of queryResult) {
          secondPassResults.push(result);
        }
        secondPassResults.done();
      } catch (error) {
        secondPassResults.reject(error);
      }
      const response = await onResponsePromiseOrError;
      if (response instanceof Error) throw response;
    } else {
      for await (const result of queryResult) {
        context.Output.emit(result);
      }
    }

    const finalResult = await queryResult.resultMetadata;
    if (finalResult instanceof Error) throw finalResult;

    if (finalResult.latestVersionHash !== this.datastoreVersionHash) {
      console.warn('Newer Datastore VersionHash is available', {
        newVersionHash: finalResult.latestVersionHash,
        usingVersionHash: this.datastoreVersionHash,
        host: this.passThroughComponents.remoteRunner,
      });
    }
  }

  protected createApiClient(context: TContext): void {
    if (this.upstreamClient) return;
    const remoteSource = this.remoteSource;
    // need lookup
    const remoteDatastore = context.datastoreMetadata.remoteDatastores[remoteSource];

    assert(remoteDatastore, `A remote datastore source could not be found for ${remoteSource}`);

    try {
      this.datastoreVersionHash = remoteDatastore.split('/').pop();
      this.upstreamClient = this.datastoreInternal.createApiClient(remoteDatastore);
    } catch (error) {
      throw new Error(
        'A valid url was not supplied for this remote datastore. Format should be ulx://<host>/<datastoreVersionHash>',
      );
    }
  }
}
