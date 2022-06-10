import { IHeroCreateOptions } from '@ulixee/hero';
import IComponentsBase, { IDefaultsObjBase, IRunFnBase } from '@ulixee/databox/interfaces/IComponentsBase';
import Runner from '../lib/Runner';
import Extractor from '../lib/Extractor';

export default interface IComponents<TInput, TOutput> extends IComponentsBase<IDefaultsObj<TInput, TOutput>, Runner<TInput, TOutput>> {
  extract?: IExtractFn<TInput, TOutput>;
}

export interface IDefaultsObj<TInput, TOutput> extends IDefaultsObjBase<TInput, TOutput> {
  hero?: Partial<IHeroCreateOptions>;
}

export type IRunFn<TInput, TOutput> = IRunFnBase<Runner<TInput, TOutput>>;

export type IExtractFn<TInput, TOutput> = (
  databox: Extractor<TInput, TOutput>,
) => void | Promise<void>;

export type IExtractElementFn<T, TInput = any, TOutput = any> = (
  element: Element,
  databox: Extractor<TInput, TOutput>,
) => T | Promise<T>;
export type IExtractElementsFn<T, TInput = any, TOutput = any> = (
  elements: Element[],
  databox: Extractor<TInput, TOutput>,
) => T | Promise<T>;

export interface IExtractElementOptions {
  name?: string;
}
