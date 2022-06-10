import Runner from "../lib/Runner";
import IComponentsBase, { IDefaultsObjBase, IRunFnBase } from "./IComponentsBase";

export default interface IComponents<TInput, TOutput> extends IComponentsBase<IDefaultsObj<TInput, TOutput>, Runner<TInput, TOutput>> {
  defaults?: IDefaultsObj<TInput, TOutput>;
  run: IRunFnBase<Runner<TInput, TOutput>>;
  schema?: any;
}

export type IDefaultsObj<TInput, TOutput> = IDefaultsObjBase<TInput, TOutput>;

export type IRunFn<TInput, TOutput> = IRunFnBase<Runner<TInput, TOutput>>;

