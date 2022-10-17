import { LaunchOptions as IPuppeteerLaunchOptions } from 'puppeteer';
import IComponentsBase, { IDefaultsObjBase, IRunFnBase } from '@ulixee/databox/interfaces/IComponentsBase';
import IRunnerObject from './IRunnerObject';

type IComponents<TInput, TOutput> = IComponentsBase<IRunnerObject<TInput, TOutput>, IDefaultsObj<TInput, TOutput>>;

export default IComponents;

export interface IDefaultsObj<TInput, TOutput> extends IDefaultsObjBase<TInput, TOutput> {
  puppeteer?: Partial<IPuppeteerLaunchOptions>;
}

export type IRunFn<TInput, TOutput> = IRunFnBase<IRunnerObject<TInput, TOutput>>;
