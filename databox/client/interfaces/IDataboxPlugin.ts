import IDataboxExecOptions from "@ulixee/databox-interfaces/IDataboxExecOptions";
import DataboxInternal from "../lib/DataboxInternal";
import DataboxObject from "../lib/DataboxObject";

export default interface IDataboxPlugin<TInput, TOutput> {
  shouldRun?: boolean;
  onStarted?(
    databoxInternal: DataboxInternal<TInput, TOutput>,
    options: IDataboxExecOptions, 
    defaults: any, 
  ): void | Promise<void>;
  onBeforeRun?(databoxObject: DataboxObject<TInput, TOutput>): void | Promise<void>;
  onBeforeClose?(): void | Promise<void>;
  onClose?(): void | Promise<void>;
}