import IDataboxRunOptions from './IDataboxRunOptions';

export default interface IDataboxWrapper<TOutput = any> {
  runtimeName: string;
  runtimeVersion: string;
  run(options?: IDataboxRunOptions): Promise<TOutput>;
}

export interface IDataboxWrapperClass {
  defaultExport: IDataboxWrapper;
}