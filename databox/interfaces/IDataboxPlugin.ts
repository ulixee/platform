import IDataboxExecOptions from "./IDataboxExecOptions";
import IDataboxInternal from "./IDataboxInternal";
import IDataboxObject from "./IDataboxObject";

export default interface IDataboxPlugin<TInput, TOutput> {
  name: string;
  version: string;
  shouldRun?: boolean;
  onExec?(
    databoxInternal: IDataboxInternal<TInput, TOutput>,
    execOptions: IDataboxExecOptions, 
    defaults: any, 
  ): void | Promise<void>;
  onBeforeRun?(databoxObject: IDataboxObject<TInput, TOutput>): void | Promise<void>;
  onBeforeClose?(): void | Promise<void>;
  onClose?(): void | Promise<void>;
}