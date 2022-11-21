import * as Puppeteer from 'puppeteer';
import { Browser as PuppeteerBrowser, LaunchOptions as IPuppeteerLaunchOptions } from 'puppeteer';
import FunctionInternal from '@ulixee/databox/lib/FunctionInternal';
import {
  FunctionPluginStatics,
  IFunctionComponents,
  IFunctionContext,
  IFunctionExecOptions,
  IFunctionSchema,
  IFunctionPlugin,
} from '@ulixee/databox';

const pkg = require('../package.json');

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
export default class PuppeteerFunctionPlugin<ISchema extends IFunctionSchema>
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
  public static readonly contextAddons: IContextAddons;

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

  public onStart(
    functionInternal: FunctionInternal<ISchema, IPuppeteerFunctionExecOptions<ISchema>>,
  ): void {
    this.execOptions = functionInternal.options;
    this.initializePuppeteer();
  }

  public async beforeRun(functionContext: IPuppeteerFunctionContext<ISchema>): Promise<void> {
    this.puppeteerBrowser = await this.puppeteerBrowserPromise;
    functionContext.browser = this.puppeteerBrowser;
  }

  public async onClose(): Promise<void> {
    if (this.puppeteerBrowserPromise) await this.puppeteerBrowserPromise;
    await this.puppeteerBrowser?.close();
  }

  protected initializePuppeteer(): void {
    const options: Puppeteer.LaunchOptions = {
      ...(this.components.defaultPuppeteerOptions ?? {}),
      ...this.execOptions,
      handleSIGTERM: true,
      handleSIGHUP: true,
      handleSIGINT: true,
    };
    this.puppeteerBrowserPromise = Puppeteer.launch(options);
  }
}
