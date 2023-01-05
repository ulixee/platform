export default interface IFunctionComponents<
  ISchema,
  IContext,
  IBeforeRunContext = IContext,
  IAfterRunContext = IContext,
> {
  name?: string;
  description?: string;
  pricePerQuery?: number;
  addOnPricing?: {
    perKb?: number;
  };
  minimumPrice?: number;
  schema?: ISchema;
  beforeRun?(context: IBeforeRunContext): void | Promise<void>;
  run(context: IContext): void | Promise<void>;
  afterRun?(context: IAfterRunContext): void | Promise<void>;
}
