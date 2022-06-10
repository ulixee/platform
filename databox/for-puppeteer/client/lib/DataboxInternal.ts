import * as Puppeteer from 'puppeteer';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import IDataboxForPuppeteerRunOptions from '../interfaces/IDataboxForPuppeteerRunOptions';
import { IDefaultsObj, IRunFn } from '../interfaces/IComponents';
import Runner from './Runner';

export default class DataboxInternal<TInput, TOutput> extends TypedEventEmitter<{
  close: void;
}> {
  public puppeteerBrowser: Puppeteer.Browser;
  public puppeteerBrowserPromise: Promise<Puppeteer.Browser>;
  readonly runOptions: IDataboxForPuppeteerRunOptions;

  readonly #input: TInput;
  #output: TOutput;
  #isClosing: Promise<void>;
  #defaults: IDefaultsObj<TInput, TOutput>;

  constructor(runOptions: IDataboxForPuppeteerRunOptions, defaults?: IDefaultsObj<TInput, TOutput>) {
    super();
    this.runOptions = runOptions;
    this.#defaults = defaults || {};
    this.#input = this.#defaults.input as TInput;
    this.#input ??= {} as TInput;
    if (runOptions.input) {
      Object.assign(this.#input, runOptions.input);
    }

    this.initializePuppeteer();
  }

  public get isClosing(): boolean {
    return !!this.#isClosing;
  }

  public get action(): string {
    return this.runOptions.action || '/';
  }

  public get input(): TInput {
    return { ...this.#input };
  }

  public get output(): TOutput {
    return this.#output;
  }

  public set output(value: any | any[]) {
    this.#output = value;
  }

  public get schema(): { [key: string]: any } {
    return {};
  }

  public async execRunner(runFn: IRunFn<TInput, TOutput>): Promise<void> {
    const runner = new Runner<TInput, TOutput>(this);
    this.puppeteerBrowser = await this.puppeteerBrowserPromise;
    await runFn(runner);
  }

  public close(): Promise<void> {
    if (this.#isClosing) return this.#isClosing;
    this.emit('close');
    this.#isClosing = new Promise(async (resolve, reject) => {
      try {
        await this.puppeteerBrowser.close();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    return this.#isClosing;
  }

  protected initializePuppeteer(): void {
    const options: Puppeteer.LaunchOptions = {
      ...this.#defaults.puppeteer,
      ...this.runOptions,
    };
    this.puppeteerBrowserPromise = Puppeteer.launch(options);
  }
}
