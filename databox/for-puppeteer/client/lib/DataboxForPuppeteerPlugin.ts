import * as Puppeteer from 'puppeteer';
import DataboxInternal from '@ulixee/databox/lib/DataboxInternal';
import IDataboxPlugin from '@ulixee/databox-interfaces/IDataboxPlugin';
import IDataboxSchema from '@ulixee/databox-interfaces/IDataboxSchema';
import IDataboxForPuppeteerExecOptions from '../interfaces/IDataboxForPuppeteerExecOptions';
import { IDefaultsObj } from '../interfaces/IComponents';
import IDataboxObject from "../interfaces/IDataboxObject";

const pkg = require('../package.json');

export default class DataboxForPuppeteerPlugin<ISchema extends IDataboxSchema>
  implements IDataboxPlugin<ISchema>
{
  public name = pkg.name;
  public version = pkg.version;

  public puppeteerBrowser: Puppeteer.Browser;
  public puppeteerBrowserPromise: Promise<Puppeteer.Browser>;
  public databoxInternal: DataboxInternal<ISchema>;

  private execOptions: IDataboxForPuppeteerExecOptions<ISchema>;
  private defaults: IDefaultsObj<ISchema>;

  public onExec(
    databoxInternal: DataboxInternal<ISchema>,
    execOptions: IDataboxForPuppeteerExecOptions<ISchema>,
    defaults: IDefaultsObj<ISchema>,
  ): void {
    this.execOptions = execOptions;
    this.defaults = defaults;
    this.initializePuppeteer();
  }

  public async onBeforeRun(databoxObject: IDataboxObject<ISchema>): Promise<void> {
    this.puppeteerBrowser = await this.puppeteerBrowserPromise;
    databoxObject.browser = this.puppeteerBrowser;
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
      handleSIGINT: true,
    };
    this.puppeteerBrowserPromise = Puppeteer.launch(options);
  }
}
