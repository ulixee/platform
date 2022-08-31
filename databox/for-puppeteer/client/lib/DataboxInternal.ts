import * as Puppeteer from 'puppeteer';
import DataboxInternalAbstract from '@ulixee/databox/lib/abstracts/DataboxInternalAbstract';
import { IRunFnBase } from '@ulixee/databox/interfaces/IComponentsBase';
import IDataboxForPuppeteerRunOptions from '../interfaces/IDataboxForPuppeteerRunOptions';
import { IDefaultsObj } from '../interfaces/IComponents';
import RunnerObject from './RunnerObject';

export default class DataboxInternal<TInput, TOutput> extends DataboxInternalAbstract<
  RunnerObject<TInput, TOutput>,
  IDefaultsObj<TInput, TOutput>,
  TInput,
  TOutput,
  IDataboxForPuppeteerRunOptions
> {
  public puppeteerBrowser: Puppeteer.Browser;
  public puppeteerBrowserPromise: Promise<Puppeteer.Browser>;

  constructor(runOptions: IDataboxForPuppeteerRunOptions, defaults?: IDefaultsObj<TInput, TOutput>) {
    super(runOptions, defaults);
    this.initializePuppeteer();
  }

  public override async execRunner(runFn: IRunFnBase<RunnerObject<TInput, TOutput>>): Promise<void> {
    this.puppeteerBrowser = await this.puppeteerBrowserPromise;
    await super.execRunner(runFn);
  }

  public override async close(closeFn?: () => Promise<void>): Promise<void> {
    await super.close(async () => {
      if (closeFn) await closeFn();
      if (this.puppeteerBrowserPromise) await this.puppeteerBrowserPromise;
      await this.puppeteerBrowser?.close();
    });
  }

  protected initializePuppeteer(): void {
    const options: Puppeteer.LaunchOptions = {
      ...this.defaults.puppeteer,
      ...this.runOptions,
      handleSIGTERM: true,
      handleSIGHUP: true,
      handleSIGINT: true
    };
    this.puppeteerBrowserPromise = Puppeteer.launch(options);
  }

  protected createRunnerObject(): RunnerObject<TInput, TOutput> {
    return new RunnerObject(this);
  }
}
