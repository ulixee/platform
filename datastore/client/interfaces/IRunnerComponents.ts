export default interface IRunnerComponents<ISchema, IContext> {
  name?: string;
  description?: string;
  pricePerQuery?: number;
  addOnPricing?: {
    perKb?: number;
  };
  minimumPrice?: number;
  schema?: ISchema;
  run(context: IContext): void | Promise<void>;
}
