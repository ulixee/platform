import * as Puppeteer from 'puppeteer';
import DataboxInternal from '@ulixee/databox/lib/DataboxInternal';
import IDataboxPlugin from "@ulixee/databox-interfaces/IDataboxPlugin";
import IDataboxForPuppeteerExecOptions from '../interfaces/IDataboxForPuppeteerExecOptions';
import { IDefaultsObj } from '../interfaces/IComponents';
import IRunnerObject from "../interfaces/IRunnerObject";

const pkg = require('../package.json');

export default class DataboxForPuppeteerPlugin<TInput, TOutput> implements IDataboxPlugin<TInput, TOutput> {
  public name = pkg.name;
  public version = pkg.version;

  public puppeteerBrowser: Puppeteer.Browser;
  public puppeteerBrowserPromise: Promise<Puppeteer.Browser>;
  public databoxInternal: DataboxInternal<TInput, TOutput>;

  private execOptions: IDataboxForPuppeteerExecOptions;
  private defaults: IDefaultsObj<TInput, TOutput>;

  public onExec(
    databoxInternal: DataboxInternal<TInput, TOutput>,
    execOptions: IDataboxForPuppeteerExecOptions, 
    defaults: IDefaultsObj<TInput, TOutput>, 
  ): void {
    this.execOptions = execOptions;
    this.defaults = defaults;
    this.initializePuppeteer();
  }

  public async onBeforeRun(runnerObject: IRunnerObject<TInput, TOutput>): Promise<void> {
    this.puppeteerBrowser = await this.puppeteerBrowserPromise;
    runnerObject.browser = this.puppeteerBrowser;
  }

  public async onClose(): Promise<void> {
    if (this.puppeteerBrowserPromise) await this.puppeteerBrowserPromise;
    await this.puppeteerBrowser?.close();
  }

  protected initializePuppeteer(): void {
    const options: Puppeteer.LaunchOptions = {
      ...this.defaults.puppeteer,
      ...this.execOptions,
      handleSIGTERM: true,
      handleSIGHUP: true,
      handleSIGINT: true
    };
    this.puppeteerBrowserPromise = Puppeteer.launch(options);
  }
}
