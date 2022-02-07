import IDataboxRunOptions from './IDataboxRunOptions';

export default interface IDataboxPackage<TInput = any, TOutput = any> {
  run(options?: IDataboxRunOptions<TInput>): Promise<void>
}
