import IFunctionComponents from './IFunctionComponents';
import IFunctionContext from './IFunctionContext';
import IFunctionExecOptions from './IFunctionExecOptions';
import IFunctionPlugin from './IFunctionPlugin';

export type IFunctionPluginConstructor<
  ISchema,
  IExtraAddons = object,
  TContextAddons = object,
  TComponentAddons = object,
> = {
  new (
    components?: IFunctionComponents<ISchema, IFunctionContext<ISchema> & TComponentAddons>,
  ): IFunctionPlugin<
    ISchema,
    IFunctionExecOptions<ISchema> & IExtraAddons,
    IFunctionContext<ISchema> & TContextAddons
  >;
  readonly execArgAddons: IExtraAddons;
  readonly componentAddons: TContextAddons;
  readonly contextAddons: TComponentAddons;
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type,@typescript-eslint/no-unused-vars
export function FunctionPluginStatics<ISchema>(staticClass: IFunctionPluginConstructor<ISchema>) {}
