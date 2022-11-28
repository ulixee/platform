export default interface IFunctionComponents<ISchema, IContext> {
  run(context: IContext): void | Promise<void>;
  schema?: ISchema;
}
