import IComponentsBase, { IDefaultsObjBase, IRunFnBase } from "./IComponentsBase";

export default interface IComponents<TRunnerObject, IDefaultsObj> extends IComponentsBase<TRunnerObject, IDefaultsObj> {
  defaults?: IDefaultsObj;
  run: IRunFnBase<TRunnerObject>;
  schema?: any;
}

export type IDefaultsObj<TInput, TOutput> = IDefaultsObjBase<TInput, TOutput>;

