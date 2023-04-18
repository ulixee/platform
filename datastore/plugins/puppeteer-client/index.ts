import '@ulixee/commons/lib/SourceMapSupport';
import {
  ExtractorPluginStatics,
  IExtractorContext,
  IExtractorRunOptions,
  IExtractorPlugin,
  IExtractorSchema,
} from '@ulixee/datastore';
import * as Puppeteer from 'puppeteer';
import { Browser as PuppeteerBrowser, LaunchOptions as IPuppeteerLaunchOptions } from 'puppeteer';
import ExtractorInternal from '@ulixee/datastore/lib/ExtractorInternal';

const pkg = require('./package.json');

export * from '@ulixee/datastore';

type IContextAddons = { launchBrowser(): Promise<PuppeteerBrowser> };
export type IPuppeteerExtractorContext<ISchema> = IExtractorContext<ISchema> & IContextAddons;

export type IPuppeteerExtractorRunOptions<ISchema> = IExtractorRunOptions<ISchema> &
  IPuppeteerLaunchOptions;

@ExtractorPluginStatics
export class PuppeteerExtractorPlugin<ISchema extends IExtractorSchema>
  implements
    IExtractorPlugin<
      ISchema,
      IPuppeteerExtractorRunOptions<ISchema>,
      IPuppeteerExtractorContext<ISchema>
    >
{
  public static readonly runArgAddons: IPuppeteerLaunchOptions;
  public static readonly contextAddons: IContextAddons;

  public name = pkg.name;
  public version = pkg.version;

  public puppeteerBrowserPromise: Promise<Puppeteer.Browser>;

  private runOptions: IPuppeteerExtractorRunOptions<ISchema>;

  async run(
    extractorInternal: ExtractorInternal<ISchema, IPuppeteerExtractorRunOptions<ISchema>>,
    context: IPuppeteerExtractorContext<ISchema>,
    next: () => Promise<IExtractorContext<ISchema>['outputs']>,
  ): Promise<void> {
    this.runOptions = extractorInternal.options;
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
      ...this.runOptions,
      handleSIGTERM: true,
      handleSIGHUP: true,
      handleSIGINT: true,
      pipe: true,
    };
    this.puppeteerBrowserPromise = Puppeteer.launch(options);
    return this.puppeteerBrowserPromise;
  }
}
