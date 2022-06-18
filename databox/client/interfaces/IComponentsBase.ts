
export default interface IComponentsBase<TRunnerObject, TDefaultsObj> {
  run: IRunFnBase<TRunnerObject>;
  defaults?: TDefaultsObj;
  schema?: any;
}

export interface IDefaultsObjBase<TInput, TOutput> {
  input?: Partial<TInput>;
  output?: Partial<TOutput>;
}

export type IRunFnBase<TRunnerObject> = (databox: TRunnerObject) => void | Promise<void>;

