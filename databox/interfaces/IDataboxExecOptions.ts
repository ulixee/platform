export default interface IDataboxExecOptions<TInput = any> {
  action?: string;
  input?: TInput;
  fields?: {};
}
