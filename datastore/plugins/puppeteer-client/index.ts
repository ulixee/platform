import '@ulixee/commons/lib/SourceMapSupport';
import {
  FunctionPluginStatics,
  IFunctionContext,
  IFunctionExecOptions,
  IFunctionPlugin,
  IFunctionSchema,
} from '@ulixee/datastore';
import * as Puppeteer from 'puppeteer';
import { Browser as PuppeteerBrowser, LaunchOptions as IPuppeteerLaunchOptions } from 'puppeteer';
import FunctionInternal from '@ulixee/datastore/lib/FunctionInternal';

const pkg = require('./package.json');

export * from '@ulixee/datastore';

type IContextAddons = { launchBrowser(): Promise<PuppeteerBrowser> };
export type IPuppeteerFunctionContext<ISchema> = IFunctionContext<ISchema> & IContextAddons;

export type IPuppeteerFunctionExecOptions<ISchema> = IFunctionExecOptions<ISchema> &
  IPuppeteerLaunchOptions;

@FunctionPluginStatics
export class PuppeteerFunctionPlugin<ISchema extends IFunctionSchema>
  implements
    IFunctionPlugin<
      ISchema,
      IPuppeteerFunctionExecOptions<ISchema>,
      IPuppeteerFunctionContext<ISchema>
    >
{
  public static readonly execArgAddons: IPuppeteerLaunchOptions;
  public static readonly contextAddons: IContextAddons;

  public name = pkg.name;
  public version = pkg.version;

  public puppeteerBrowserPromise: Promise<Puppeteer.Browser>;

  private execOptions: IPuppeteerFunctionExecOptions<ISchema>;

  async run(
    functionInternal: FunctionInternal<ISchema, IPuppeteerFunctionExecOptions<ISchema>>,
    context: IPuppeteerFunctionContext<ISchema>,
    next: () => Promise<IFunctionContext<ISchema>['outputs']>,
  ): Promise<void> {
    this.execOptions = functionInternal.options;
    try {
      context.launchBrowser = this.initializePuppeteer.bind(this);
      await next();
    } finally {
      if (this.puppeteerBrowserPromise) {
        const browser = await this.puppeteerBrowserPromise;
        await browser.close();
      }
    }
  }

  protected initializePuppeteer(): Promise<PuppeteerBrowser> {
    const options: Puppeteer.LaunchOptions = {
      ...this.execOptions,
      handleSIGTERM: true,
      handleSIGHUP: true,
      handleSIGINT: true,
      pipe: true,
    };
    this.puppeteerBrowserPromise = Puppeteer.launch(options);
    return this.puppeteerBrowserPromise;
  }
}
