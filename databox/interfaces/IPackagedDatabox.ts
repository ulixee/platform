import IDataboxRunOptions from './IDataboxRunOptions';

export default interface IPackagedDatabox {
  run(options?: IDataboxRunOptions): Promise<void>
}
