import { LaunchOptions as IPuppeteerLaunchOptions } from 'puppeteer';
import IComponentsBase, { IDefaultsObjBase, IRunFnBase } from '@ulixee/databox/interfaces/IComponentsBase';
import RunnerObject from '../lib/RunnerObject';

type IComponents<TInput, TOutput> = IComponentsBase<RunnerObject<TInput, TOutput>, IDefaultsObj<TInput, TOutput>>;

export default IComponents;

export interface IDefaultsObj<TInput, TOutput> extends IDefaultsObjBase<TInput, TOutput> {
  puppeteer?: Partial<IPuppeteerLaunchOptions>;
}

export type IRunFn<TInput, TOutput> = IRunFnBase<RunnerObject<TInput, TOutput>>;
