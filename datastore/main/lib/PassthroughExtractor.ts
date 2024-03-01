import { strict as assert } from 'node:assert';
import { ExtractSchemaType } from '@ulixee/schema';
import IExtractorComponents from '../interfaces/IExtractorComponents';
import IExtractorContext from '../interfaces/IExtractorContext';
import { IExtractorPluginConstructor } from '../interfaces/IExtractorPluginStatics';
import IExtractorSchema from '../interfaces/IExtractorSchema';
import DatastoreApiClient, { IDatastoreExecRelayArgs } from './DatastoreApiClient';
import Extractor from './Extractor';
import ResultIterable from './ResultIterable';

export interface IPassthroughExtractorComponents<
  TRemoteSources extends Record<string, string>,
  TExtractorName extends string,
  TSchema extends IExtractorSchema = IExtractorSchema<any, any>,
  TContext extends IExtractorContext<TSchema> &
    IDatastoreExecRelayArgs = IExtractorContext<TSchema> & IDatastoreExecRelayArgs,
> {
  remoteExtractor: `${keyof TRemoteSources & string}.${TExtractorName}`;
  upcharge?: number;
  onRequest?: (context: TContext) => Promise<any>;
  onResponse?: (
    context: TContext & { stream: AsyncIterable<ExtractSchemaType<TSchema['output']>> },
  ) => Promise<any>;
}

export default class PassthroughExtractor<
  TRemoteSources extends Record<string, string>,
  TExtractorName extends string,
  TSchema extends IExtractorSchema = IExtractorSchema<any, any>,
  TPlugin1 extends IExtractorPluginConstructor<TSchema> = IExtractorPluginConstructor<TSchema>,
  TPlugin2 extends IExtractorPluginConstructor<TSchema> = IExtractorPluginConstructor<TSchema>,
  TPlugin3 extends IExtractorPluginConstructor<TSchema> = IExtractorPluginConstructor<TSchema>,
  TOutput extends ExtractSchemaType<TSchema['output']> = ExtractSchemaType<TSchema['output']>,
  TContext extends IExtractorContext<TSchema> &
    IDatastoreExecRelayArgs = IExtractorContext<TSchema> &
    TPlugin1['contextAddons'] &
    TPlugin2['contextAddons'] &
    TPlugin3['contextAddons'] &
    IDatastoreExecRelayArgs,
> extends Extractor<TSchema, TPlugin1, TPlugin2, TPlugin3, TContext> {
  public readonly remoteSource: string;
  public readonly remoteExtractor: string;
  public remoteDatastoreId: string;
  public remoteVersion: string;
  public remoteDomain: string;

  protected upstreamClient: DatastoreApiClient;
  protected readonly passThroughComponents: IPassthroughExtractorComponents<
    TRemoteSources,
    TExtractorName,
    TSchema,
    TContext
  >;

  constructor(
    components: Pick<IExtractorComponents<TSchema, TContext>, 'name' | 'description' | 'schema'> &
      IPassthroughExtractorComponents<TRemoteSources, TExtractorName> &
      TPlugin1['componentAddons'] &
      TPlugin2['componentAddons'] &
      TPlugin3['componentAddons'],
    ...plugins: [plugin1?: TPlugin1, plugin2?: TPlugin2, plugin3?: TPlugin3]
  ) {
    super({ ...components } as any, ...plugins);
    this.components.run = this.run.bind(this);
    this.basePrice = components.upcharge ?? 0;
    assert(components.remoteExtractor, 'A remote extractor name is required');
    assert(components.remoteExtractor.includes('.'), 'A remote function source is required');
    this.passThroughComponents = components as any;
    const [source, remoteExtractor] = components.remoteExtractor.split('.');
    this.remoteExtractor = remoteExtractor;
    this.remoteSource = source;
  }

  protected async run(context: TContext): Promise<void> {
    await this.injectRemoteClient();

    if (this.passThroughComponents.onRequest) {
      await this.passThroughComponents.onRequest(context);
    }

    const queryResult = this.upstreamClient.stream<{ output: TOutput; input: any }>(
      this.remoteDatastoreId,
      this.remoteVersion,
      this.remoteExtractor,
      context.input,
      {
        paymentService: this.datastoreInternal.remotePaymentService,
        authentication: context.authentication,
        affiliateId: context.datastoreAffiliateId,
        domain: this.remoteDomain,
        queryId: context.queryId,
        onQueryResult: context.onQueryResult,
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

    if (finalResult.latestVersion !== this.remoteVersion) {
      console.warn('Newer Datastore Version is available', {
        newVersion: finalResult.latestVersion,
        usingVersion: this.remoteVersion,
        host: this.passThroughComponents.remoteExtractor,
      });
    }
  }

  protected async injectRemoteClient(): Promise<void> {
    if (this.upstreamClient) return;
    const { datastoreHost, client } = await this.datastoreInternal.getRemoteApiClient(
      this.remoteSource,
    );

    this.remoteDatastoreId = datastoreHost.datastoreId;
    this.remoteVersion = datastoreHost.version;
    this.remoteDomain = datastoreHost.domain;
    this.upstreamClient = client;
  }
}
