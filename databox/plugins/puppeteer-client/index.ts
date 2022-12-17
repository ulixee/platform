import '@ulixee/commons/lib/SourceMapSupport';
import {
  FunctionPluginStatics,
  IFunctionComponents,
  IFunctionContext,
  IFunctionExecOptions,
  IFunctionPlugin,
  IFunctionSchema,
} from '@ulixee/databox';
import * as Puppeteer from 'puppeteer';
import { Browser as PuppeteerBrowser, LaunchOptions as IPuppeteerLaunchOptions } from 'puppeteer';
import FunctionInternal from '@ulixee/databox/lib/FunctionInternal';
import { IFunctionLifecycle } from '@ulixee/databox/interfaces/IFunctionPlugin';

const pkg = require('./package.json');

export * from '@ulixee/databox';
export type IPupppeteerFunctionComponents<ISchema> = IFunctionComponents<
  ISchema,
  IFunctionContext<ISchema>
> & {
  defaultPuppeteerOptions?: Partial<IPuppeteerLaunchOptions>;
};

type IContextAddons = { browser: PuppeteerBrowser };
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
  public static readonly componentAddons: {
    defaultPuppeteerOptions?: IPuppeteerLaunchOptions;
  };

  public static readonly execArgAddons: IPuppeteerLaunchOptions;
  public static readonly runContextAddons: IContextAddons;

  public name = pkg.name;
  public version = pkg.version;

  public puppeteerBrowser: Puppeteer.Browser;
  public puppeteerBrowserPromise: Promise<Puppeteer.Browser>;
  public functionInternal: FunctionInternal<ISchema, IPuppeteerFunctionExecOptions<ISchema>>;

  private execOptions: IPuppeteerFunctionExecOptions<ISchema>;
  private components: IPupppeteerFunctionComponents<ISchema>;

  constructor(components: IPupppeteerFunctionComponents<ISchema>) {
    this.components = components;
  }

  async run(
    functionInternal: FunctionInternal<ISchema, IPuppeteerFunctionExecOptions<ISchema>>,
    lifecycle: IFunctionLifecycle<ISchema, IPuppeteerFunctionContext<ISchema>>,
    next: () => Promise<IFunctionContext<ISchema>['outputs']>,
  ): Promise<void> {
    this.execOptions = functionInternal.options;
    this.initializePuppeteer();
    try {
      this.puppeteerBrowser = await this.puppeteerBrowserPromise;
      lifecycle.run.context.browser = this.puppeteerBrowser;
      await next();
    } finally {
      await this.puppeteerBrowser?.close();
    }
  }

  protected initializePuppeteer(): void {
    const options: Puppeteer.LaunchOptions = {
      ...(this.components.defaultPuppeteerOptions ?? {}),
      ...this.execOptions,
      handleSIGTERM: true,
      handleSIGHUP: true,
      handleSIGINT: true,
      pipe: true
    };
    this.puppeteerBrowserPromise = Puppeteer.launch(options);
  }
}
