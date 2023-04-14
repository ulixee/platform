import IExtractorComponents from './IExtractorComponents';
import IExtractorContext from './IExtractorContext';
import IExtractorRunOptions from './IExtractorRunOptions';
import IExtractorPlugin from './IExtractorPlugin';

export type IExtractorPluginConstructor<
  ISchema,
  IExtraAddons = object,
  TContextAddons = object,
  TComponentAddons = object,
> = {
  new (
    components?: IExtractorComponents<ISchema, IExtractorContext<ISchema> & TComponentAddons>,
  ): IExtractorPlugin<
    ISchema,
    IExtractorRunOptions<ISchema> & IExtraAddons,
    IExtractorContext<ISchema> & TContextAddons
  >;
  readonly execArgAddons?: IExtraAddons;
  readonly componentAddons?: TContextAddons;
  readonly contextAddons?: TComponentAddons;
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type,@typescript-eslint/no-unused-vars
export function ExtractorPluginStatics<ISchema>(staticClass: IExtractorPluginConstructor<ISchema>) {}
