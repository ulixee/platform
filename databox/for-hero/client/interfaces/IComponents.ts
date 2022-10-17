import Hero, { IHeroCreateOptions, HeroExtractor } from '@ulixee/hero';
import IComponentsBase, { IDefaultsObjBase, IRunFnBase } from '@ulixee/databox/interfaces/IComponentsBase';
import IRunnerObject from './IRunnerObject';

export default interface IComponents<TInput, TOutput> extends IComponentsBase<IRunnerObject<TInput, TOutput, Hero>, IDefaultsObj<TInput, TOutput>> {
  runExtractor?: IRunFnBase<IRunnerObject<TInput, TOutput, HeroExtractor>>;
}

export interface IDefaultsObj<TInput, TOutput> extends IDefaultsObjBase<TInput, TOutput> {
  hero?: Partial<IHeroCreateOptions>;
}

export type IRunFn<TInput, TOutput> = IRunFnBase<IRunnerObject<TInput, TOutput, Hero>>;
