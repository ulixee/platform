import * as assert from 'assert';
import Function from './Function';
import IFunctionSchema from '../interfaces/IFunctionSchema';
import IFunctionComponents from '../interfaces/IFunctionComponents';
import IFunctionContext from '../interfaces/IFunctionContext';
import DataboxApiClient, { IDataboxExecRelayArgs } from './DataboxApiClient';
import { IFunctionPluginConstructor } from '../interfaces/IFunctionPluginStatics';

export interface IPassthroughFunctionComponents<
  TRemoteSources extends Record<string, string>,
  TFunctionName extends string,
> {
  remoteFunction: `${keyof TRemoteSources & string}.${TFunctionName}`;
  upcharge?: number;
}

export default class PassthroughFunction<
  TRemoteSources extends Record<string, string>,
  TFunctionName extends string,
  ISchema extends IFunctionSchema = IFunctionSchema<any, any>,
  IRunContext extends IFunctionContext<ISchema> &
    IDataboxExecRelayArgs = IFunctionContext<ISchema> & IDataboxExecRelayArgs,
> extends Function<
  ISchema,
  IFunctionPluginConstructor<ISchema>,
  IFunctionPluginConstructor<ISchema>,
  IFunctionPluginConstructor<ISchema>,
  IRunContext
> {
  protected client: DataboxApiClient;
  protected databoxVersionHash: string;
  protected readonly passThroughComponents: IPassthroughFunctionComponents<
    TRemoteSources,
    TFunctionName
  >;

  constructor(
    components: Omit<
      IFunctionComponents<ISchema, IRunContext>,
      'run' | 'pricePerQuery' | 'minimumPrice' | 'addOnPricing'
    > &
      IPassthroughFunctionComponents<TRemoteSources, TFunctionName>,
  ) {
    super({ ...components } as any);
    this.components.run = this.run.bind(this);
    this.components.pricePerQuery = components.upcharge ?? 0;
    this.components.minimumPrice = components.upcharge ?? 0;
    assert(components.remoteFunction, 'A remote function is required');
    assert(components.remoteFunction.includes('.'), 'A remote function source is required');
    this.passThroughComponents = components;
  }

  protected async run(context: IRunContext): Promise<void> {
    if (!this.client) {
      const remoteSource = this.passThroughComponents.remoteFunction.split('.').shift();
      // need lookup
      const remoteDatabox = context.databox.remoteDataboxes[remoteSource];

      assert(remoteDatabox, `A remote databox source could not be found for ${remoteSource}`);

      try {
        const url = new URL(remoteDatabox);
        this.databoxVersionHash = url.pathname.slice(1);
        this.client = new DataboxApiClient(url.host);
      } catch (error) {
        throw new Error(
          'A valid url was not supplied for this remote databox. Format should be ulx://<host>/<databoxVersionHash>',
        );
      }
    }

    const functionName = this.passThroughComponents.remoteFunction.split('.').pop();

    const args = Object.entries(context.input);
    const queryResult = await this.client.query(
      this.databoxVersionHash,
      `select * from ${functionName}(${args.map((x, i) => `${x[0]}=>$${i + 1}`)})`,
      {
        boundValues: args.map(x => x[1]),
        payment: context.payment,
        authentication: context.authentication,
      },
    );

    if (queryResult.error) throw queryResult.error;

    const upstreamOutput = queryResult.output;
    if (upstreamOutput) {
      if (this.components.schema?.output?.typeName === 'array') {
        context.output = upstreamOutput as any;
      } else {
        context.output = upstreamOutput[0];
      }
    }
    if (queryResult.latestVersionHash !== this.databoxVersionHash) {
      console.warn('Newer Databox VersionHash is available', {
        newVersionHash: queryResult.latestVersionHash,
        usingVersionHash: this.databoxVersionHash,
        host: this.passThroughComponents.remoteFunction,
      });
    }
  }
}
