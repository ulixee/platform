import IDataboxExecOptions from './IDataboxExecOptions';

export default interface IDataboxExecutable<TOutput = any, TDataboxExecOptions = IDataboxExecOptions> {
  coreVersion: string;
  corePlugins?: { [name: string]: string };
  exec(options?: TDataboxExecOptions): Promise<TOutput>;
}