import IDataboxExecOptions from "./IDataboxExecOptions";
import IDataboxInternal from "./IDataboxInternal";
import IRunnerObject from "./IRunnerObject";

export default interface IDataboxPlugin<TInput, TOutput> {
  name: string;
  version: string;
  shouldRun?: boolean;
  onExec?(
    databoxInternal: IDataboxInternal<TInput, TOutput>,
    execOptions: IDataboxExecOptions, 
    defaults: any, 
  ): void | Promise<void>;
  onBeforeRun?(runnerObject: IRunnerObject<TInput, TOutput>): void | Promise<void>;
  onBeforeClose?(): void | Promise<void>;
  onClose?(): void | Promise<void>;
}