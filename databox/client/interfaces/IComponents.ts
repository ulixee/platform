import IDataboxPlugin from "@ulixee/databox-interfaces/IDataboxPlugin";

export default interface IComponents<TInput, TOutput, TDataboxObject, TDefaultsObj> {
  run: IRunFn<TDataboxObject>;
  defaults?: TDefaultsObj;
  schema?: any;
  plugins?: IDataboxPlugin<TInput, TOutput>[];
}

export interface IDefaultsObj<TInput, TOutput> {
  input?: Partial<TInput>;
  output?: Partial<TOutput>;
}

export type IRunFn<TDataboxObject> = (databox: TDataboxObject) => void | Promise<void>;
