import IDataboxRunOptions from './IDataboxRunOptions';

export default interface IDataboxPackage {
  run(options?: IDataboxRunOptions): Promise<void>
}
