
export default interface IComponentsBase<TDefaultsObj, Runner> {
  defaults?: TDefaultsObj;
  run: IRunFnBase<Runner>;
  schema?: any;
}

export interface IDefaultsObjBase<TInput, TOutput> {
  input?: Partial<TInput>;
  output?: Partial<TOutput>;
}

export type IRunFnBase<Runner> = (databox: Runner) => void | Promise<void>;

