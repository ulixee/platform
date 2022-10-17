import { IHeroCreateOptions } from '@ulixee/hero';
import IComponentsBase, { 
  IDefaultsObj as IDefaultsObjBase, 
  IRunFn as IRunFnBase 
} from '@ulixee/databox/interfaces/IComponents';
import IDataboxObject, { IDataboxObjectForReplay } from './IDataboxObject';

export default interface IComponents<TInput, TOutput> extends IComponentsBase<TInput, TOutput, IDataboxObject<TInput, TOutput>, IDefaultsObj<TInput, TOutput>> {
  onAfterHeroCompletes?: IRunFnBase<IDataboxObjectForReplay<TInput, TOutput>>;
}

export interface IDefaultsObj<TInput, TOutput> extends IDefaultsObjBase<TInput, TOutput> {
  hero?: Partial<IHeroCreateOptions>;
}

export type IRunFn<TInput, TOutput> = IRunFnBase<IDataboxObject<TInput, TOutput>>;
