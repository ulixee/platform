export default interface IDataboxRunOptions<TInput = any> {
  action?: string;
  input?: TInput;
  fields?: {};
}
