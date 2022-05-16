import { IHeroCreateOptions } from '@ulixee/hero';
import Runner from '../lib/Runner';
import Extractor from '../lib/Extractor';

export default interface IComponents<TInput, TOutput> {
  defaults?: IDefaultsObj<TInput, TOutput>;
  run: IRunFn<TInput, TOutput>;
  extract?: IExtractFn<TInput, TOutput>;
  schema?: any;
}

export interface IDefaultsObj<TInput, TOutput> {
  hero?: Partial<IHeroCreateOptions>;
  input?: Partial<TInput>;
  output?: Partial<TOutput>;
}

export type IRunFn<TInput, TOutput> = (databox: Runner<TInput, TOutput>) => void | Promise<void>;
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
