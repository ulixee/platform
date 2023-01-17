import * as assert from 'assert';
import { ExtractSchemaType } from '@ulixee/schema';
import Function from './Function';
import IFunctionSchema from '../interfaces/IFunctionSchema';
import IFunctionComponents from '../interfaces/IFunctionComponents';
import IFunctionContext from '../interfaces/IFunctionContext';
import DatastoreApiClient, { IDatastoreExecRelayArgs } from './DatastoreApiClient';
import { IFunctionPluginConstructor } from '../interfaces/IFunctionPluginStatics';
import ResultIterable from './ResultIterable';

export interface IPassthroughFunctionComponents<
  TRemoteSources extends Record<string, string>,
  TFunctionName extends string,
  TSchema extends IFunctionSchema = IFunctionSchema<any, any>,
  TContext extends IFunctionContext<TSchema> & IDatastoreExecRelayArgs = IFunctionContext<TSchema> &
    IDatastoreExecRelayArgs,
> {
  remoteFunction: `${keyof TRemoteSources & string}.${TFunctionName}`;
  upcharge?: number;
  onRequest?: (context: TContext) => Promise<any>;
  onResponse?: (
    context: TContext & { stream: AsyncIterable<ExtractSchemaType<TSchema['output']>> },
  ) => Promise<any>;
}

export default class PassthroughFunction<
  TRemoteSources extends Record<string, string>,
  TFunctionName extends string,
  TSchema extends IFunctionSchema = IFunctionSchema<any, any>,
  TPlugin1 extends IFunctionPluginConstructor<TSchema> = IFunctionPluginConstructor<TSchema>,
  TPlugin2 extends IFunctionPluginConstructor<TSchema> = IFunctionPluginConstructor<TSchema>,
  TPlugin3 extends IFunctionPluginConstructor<TSchema> = IFunctionPluginConstructor<TSchema>,
  TOutput extends ExtractSchemaType<TSchema['output']> = ExtractSchemaType<TSchema['output']>,
  TContext extends IFunctionContext<TSchema> & IDatastoreExecRelayArgs = IFunctionContext<TSchema> &
    TPlugin1['contextAddons'] &
    TPlugin2['contextAddons'] &
    TPlugin3['contextAddons'] &
    IDatastoreExecRelayArgs,
> extends Function<TSchema, TPlugin1, TPlugin2, TPlugin3, TContext> {
  public readonly remoteSource: string;
  public readonly remoteFunction: string;
  public datastoreVersionHash: string;

  protected upstreamClient: DatastoreApiClient;
  protected readonly passThroughComponents: IPassthroughFunctionComponents<
    TRemoteSources,
    TFunctionName,
    TSchema,
    TContext
  >;

  constructor(
    components: Pick<IFunctionComponents<TSchema, TContext>, 'name' | 'schema'> &
      IPassthroughFunctionComponents<TRemoteSources, TFunctionName> &
      TPlugin1['componentAddons'] &
      TPlugin2['componentAddons'] &
      TPlugin3['componentAddons'],
    ...plugins: [plugin1?: TPlugin1, plugin2?: TPlugin2, plugin3?: TPlugin3]
  ) {
    super({ ...components } as any, ...plugins);
    this.components.run = this.run.bind(this);
    this.pricePerQuery = components.upcharge ?? 0;
    this.minimumPrice = components.upcharge ?? 0;
    assert(components.remoteFunction, 'A remote function is required');
    assert(components.remoteFunction.includes('.'), 'A remote function source is required');
    this.passThroughComponents = components;
    const [source, remoteFunction] = components.remoteFunction.split('.');
    this.remoteFunction = remoteFunction;
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
      this.remoteFunction,
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
        host: this.passThroughComponents.remoteFunction,
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
