import '@ulixee/commons/lib/SourceMapSupport';
import {
  RunnerPluginStatics,
  IRunnerContext,
  IRunnerExecOptions,
  IRunnerPlugin,
  IRunnerSchema,
} from '@ulixee/datastore';
import * as Puppeteer from 'puppeteer';
import { Browser as PuppeteerBrowser, LaunchOptions as IPuppeteerLaunchOptions } from 'puppeteer';
import RunnerInternal from '@ulixee/datastore/lib/RunnerInternal';

const pkg = require('./package.json');

export * from '@ulixee/datastore';

type IContextAddons = { launchBrowser(): Promise<PuppeteerBrowser> };
export type IPuppeteerRunnerContext<ISchema> = IRunnerContext<ISchema> & IContextAddons;

export type IPuppeteerRunnerExecOptions<ISchema> = IRunnerExecOptions<ISchema> &
  IPuppeteerLaunchOptions;

@RunnerPluginStatics
export class PuppeteerRunnerPlugin<ISchema extends IRunnerSchema>
  implements
    IRunnerPlugin<
      ISchema,
      IPuppeteerRunnerExecOptions<ISchema>,
      IPuppeteerRunnerContext<ISchema>
    >
{
  public static readonly execArgAddons: IPuppeteerLaunchOptions;
  public static readonly contextAddons: IContextAddons;

  public name = pkg.name;
  public version = pkg.version;

  public puppeteerBrowserPromise: Promise<Puppeteer.Browser>;

  private execOptions: IPuppeteerRunnerExecOptions<ISchema>;

  async run(
    runnerInternal: RunnerInternal<ISchema, IPuppeteerRunnerExecOptions<ISchema>>,
    context: IPuppeteerRunnerContext<ISchema>,
    next: () => Promise<IRunnerContext<ISchema>['outputs']>,
  ): Promise<void> {
    this.execOptions = runnerInternal.options;
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
