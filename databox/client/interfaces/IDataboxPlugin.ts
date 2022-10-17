import IDataboxExecOptions from "@ulixee/databox-interfaces/IDataboxExecOptions";
import DataboxInternal from "../lib/DataboxInternal";
import RunnerObject from "../lib/RunnerObject";

export default interface IDataboxPlugin<TInput, TOutput> {
  shouldRun?: boolean;
  onStarted?(
    databoxInternal: DataboxInternal<TInput, TOutput>,
    options: IDataboxExecOptions, 
    defaults: any, 
  ): void | Promise<void>;
  onBeforeRun?(runnerObject: RunnerObject<TInput, TOutput>): void | Promise<void>;
  onBeforeClose?(): void | Promise<void>;
  onClose?(): void | Promise<void>;
}