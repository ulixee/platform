import IDataboxRunOptions from '../interfaces/IDataboxRunOptions';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import Hero, { IHeroCreateOptions } from '@ulixee/hero';
import ICoreSession from '@ulixee/hero/interfaces/ICoreSession';
import { InternalPropertiesSymbol, scriptInstance } from '@ulixee/hero/lib/internal';
import Output, { createObservableOutput } from './Output';
import './DomExtender';
import './ResourceExtender';
import Runner from './Runner';
import Extractor from './Extractor';
import {
  IDefaultsObj,
  IExtractElementFn,
  IExtractElementsFn,
  IExtractFn,
  IRunFn,
} from '../interfaces/IComponents';

const databoxInternalByHero: WeakMap<Hero, DataboxInternal<any, any>> = new WeakMap();

const ModulePath = require.resolve('../index').replace(/\/index\.(?:ts|js)/, '');
scriptInstance.ignoreModulePaths.push(ModulePath);

export default class DataboxInternal<TInput, TOutput> extends TypedEventEmitter<{
  close: void;
  error: Error;
}> {
  public hero: Hero;
  readonly runOptions: IDataboxRunOptions;
  beforeClose?: () => Promise<any>;

  readonly #input: TInput;
  #output: Output<TOutput>;
  #isClosing: Promise<void>;
  #extractorPromises: Promise<any>[] = [];
  #defaults: IDefaultsObj<TInput, TOutput>;

  constructor(runOptions: IDataboxRunOptions, defaults?: IDefaultsObj<TInput, TOutput>) {
    super();
    this.runOptions = runOptions;
    this.#defaults = defaults || {};
    this.#input = (this.#defaults.input || {}) as TInput;

    this.initializeHero();

    this.beforeClose = () => this.hero.close();
    this.on('error', () => this.hero.close());
  }

  public get coreSessionPromise(): Promise<ICoreSession> {
    return this.hero[InternalPropertiesSymbol].coreSessionPromise;
  }

  public get sessionIdToExtract(): string | undefined {
    return (this.runOptions as any).extractSessionId ?? process.env.ULX_EXTRACT_SESSION_ID;
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
    if (!this.#output) {
      this.#output = createObservableOutput(this.coreSessionPromise);
      for (const [key, value] of Object.entries(this.#defaults.output || {})) {
        this.#output[key] = value;
      }
    }
    return this.#output as unknown as TOutput;
  }

  public set output(value: any | any[]) {
    const output = this.output;
    for (const key of Object.keys(output)) {
      delete output[key];
    }
    Object.assign(this.output, value);
  }

  public get sessionId(): Promise<string> {
    return this.hero.sessionId;
  }

  public get schema(): { [key: string]: any } {
    return {};
  }

  public async execRunner(runFn: IRunFn<TInput, TOutput>): Promise<void> {
    const runner = new Runner<TInput, TOutput>(this);
    await runFn(runner);
  }

  public execExtractor<T>(
    extractFn:
      | IExtractFn<TInput, TOutput>
      | IExtractElementFn<T, TInput, TOutput>
      | IExtractElementsFn<T, TInput, TOutput>,
    element?: Element | Element[],
  ): Promise<any> {
    const extractor = new Extractor<TInput, TOutput>(this);
    let response: any;
    if (Array.isArray(element)) {
      response = (extractFn as IExtractElementsFn<T, TInput, TOutput>)(
        element as Element[],
        extractor,
      );
    } else if (element) {
      response = (extractFn as IExtractElementFn<T, TInput, TOutput>)(
        element as Element,
        extractor,
      );
    } else {
      response = (extractFn as IExtractFn<TInput, TOutput>)(extractor);
    }
    this.#extractorPromises.push(response);
    return response;
  }

  public close(): Promise<void> {
    if (this.#isClosing) return this.#isClosing;
    this.emit('close');
    this.#isClosing = new Promise(async (resolve, reject) => {
      try {
        await Promise.all(this.#extractorPromises);
        if (this.beforeClose) await this.beforeClose();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    return this.#isClosing;
  }

  protected initializeHero(): void {
    const heroOptions: IHeroCreateOptions = {
      ...this.#defaults.hero,
      ...this.runOptions,
    };
    this.hero = new Hero(heroOptions);
    databoxInternalByHero.set(this.hero, this);
  }
}

export function getDataboxInternalByHero(hero: Hero): DataboxInternal<any, any> {
  return databoxInternalByHero.get(hero);
}
