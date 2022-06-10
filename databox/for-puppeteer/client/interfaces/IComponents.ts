import { LaunchOptions as IPuppeteerLaunchOptions } from 'puppeteer';
import IComponentsBase, { IDefaultsObjBase, IRunFnBase } from '@ulixee/databox/interfaces/IComponentsBase';
import Runner from '../lib/Runner';

type IComponents<TInput, TOutput> = IComponentsBase<IDefaultsObj<TInput, TOutput>, Runner<TInput, TOutput>>;

export default IComponents;

export interface IDefaultsObj<TInput, TOutput> extends IDefaultsObjBase<TInput, TOutput> {
  puppeteer?: Partial<IPuppeteerLaunchOptions>;
}

export type IRunFn<TInput, TOutput> = IRunFnBase<Runner<TInput, TOutput>>;
