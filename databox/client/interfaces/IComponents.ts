import Runner from '../lib/Runner';
import Extractor from '../lib/Extractor';

export default interface IComponents {
  run?: IRunFn;
  extract?: IExtractFn;
  schema?: any;
}

export type IRunFn = (databox: Runner) => void | Promise<void>;
export type IExtractFn = (databox: Extractor) => void | Promise<void>;

export type IExtractElementFn<T> = (element: Element, databox: Extractor) => T | Promise<T>;
export type IExtractElementsFn<T> = (elements: Element[], databox: Extractor) => T | Promise<T>;

export interface IExtractElementOptions {
  name?: string;
}
