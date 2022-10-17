import { LaunchOptions as IPuppeteerLaunchOptions } from 'puppeteer';
import IComponentsBase, { IDefaultsObj as IDefaultsObjBase, IRunFn as IRunFnBase } from '@ulixee/databox/interfaces/IComponents';
import IDataboxObject from './IDataboxObject';

type IComponents<TInput, TOutput> = IComponentsBase<TInput, TOutput, IDataboxObject<TInput, TOutput>, IDefaultsObj<TInput, TOutput>>;

export default IComponents;

export interface IDefaultsObj<TInput, TOutput> extends IDefaultsObjBase<TInput, TOutput> {
  puppeteer?: Partial<IPuppeteerLaunchOptions>;
}

export type IRunFn<TInput, TOutput> = IRunFnBase<IDataboxObject<TInput, TOutput>>;
