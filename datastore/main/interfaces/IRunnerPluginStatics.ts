import IRunnerComponents from './IRunnerComponents';
import IRunnerContext from './IRunnerContext';
import IRunnerExecOptions from './IRunnerExecOptions';
import IRunnerPlugin from './IRunnerPlugin';

export type IRunnerPluginConstructor<
  ISchema,
  IExtraAddons = object,
  TContextAddons = object,
  TComponentAddons = object,
> = {
  new (
    components?: IRunnerComponents<ISchema, IRunnerContext<ISchema> & TComponentAddons>,
  ): IRunnerPlugin<
    ISchema,
    IRunnerExecOptions<ISchema> & IExtraAddons,
    IRunnerContext<ISchema> & TContextAddons
  >;
  readonly execArgAddons?: IExtraAddons;
  readonly componentAddons?: TContextAddons;
  readonly contextAddons?: TComponentAddons;
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type,@typescript-eslint/no-unused-vars
export function RunnerPluginStatics<ISchema>(staticClass: IRunnerPluginConstructor<ISchema>) {}
