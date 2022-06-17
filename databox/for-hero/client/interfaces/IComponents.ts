import { IHeroCreateOptions } from '@ulixee/hero';
import IComponentsBase, { IDefaultsObjBase, IRunFnBase } from '@ulixee/databox/interfaces/IComponentsBase';
import RunnerObject from '../lib/RunnerObject';
import ExtractorObject from '../lib/ExtractorObject';

export default interface IComponents<TInput, TOutput> extends IComponentsBase<RunnerObject<TInput, TOutput>, IDefaultsObj<TInput, TOutput>> {
  extract?: IExtractFn<TInput, TOutput>;
}

export interface IDefaultsObj<TInput, TOutput> extends IDefaultsObjBase<TInput, TOutput> {
  hero?: Partial<IHeroCreateOptions>;
}

export type IRunFn<TInput, TOutput> = IRunFnBase<RunnerObject<TInput, TOutput>>;

export type IExtractFn<TInput, TOutput> = (
  databox: ExtractorObject<TInput, TOutput>,
) => void | Promise<void>;

export type IExtractElementFn<T, TInput = any, TOutput = any> = (
  element: Element,
  databox: ExtractorObject<TInput, TOutput>,
) => T | Promise<T>;
export type IExtractElementsFn<T, TInput = any, TOutput = any> = (
  elements: Element[],
  databox: ExtractorObject<TInput, TOutput>,
) => T | Promise<T>;

export interface IExtractElementOptions {
  name?: string;
}
