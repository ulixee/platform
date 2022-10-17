import IComponentsBase, { IDefaultsObjBase, IRunFnBase } from "./IComponentsBase";

export default interface IComponents<TRunnerObject, IDefaultsObj> extends IComponentsBase<TRunnerObject, IDefaultsObj> {
  run: IRunFnBase<TRunnerObject>;
  defaults?: IDefaultsObj;
  schema?: any;
}

export type IDefaultsObj<TInput, TOutput> = IDefaultsObjBase<TInput, TOutput>;

