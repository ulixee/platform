import Hero, { IHeroCreateOptions } from '@ulixee/hero';
import ICoreSession from '@ulixee/hero/interfaces/ICoreSession';
import { InternalPropertiesSymbol, scriptInstance } from '@ulixee/hero/lib/internal';
import DataboxInternalAbstract from '@ulixee/databox/lib/abstracts/DataboxInternalAbstract';
import IDataboxForHeroRunOptions from '../interfaces/IDataboxForHeroRunOptions';
import { createObservableOutput } from './Output';
import ExtractorObject from './ExtractorObject';
import RunnerObject from './RunnerObject';
import './DomExtender';
import './ResourceExtender';
import {
  IDefaultsObj,
  IExtractElementFn,
  IExtractElementsFn,
  IExtractFn,
} from '../interfaces/IComponents';

const databoxInternalByHero: WeakMap<Hero, DataboxInternal<any, any>> = new WeakMap();

const ModulePath = require.resolve('../index').replace(/\/index\.(?:ts|js)/, '');
scriptInstance.ignoreModulePaths.push(ModulePath);

export default class DataboxInternal<TInput, TOutput> extends DataboxInternalAbstract<
  RunnerObject<TInput, TOutput>,
  IDefaultsObj<TInput, TOutput>,
  TInput,
  TOutput,
  IDataboxForHeroRunOptions
> {
  public hero: Hero;
  override readonly runOptions: IDataboxForHeroRunOptions;

  #extractorPromises: Promise<any>[] = [];

  constructor(runOptions: IDataboxForHeroRunOptions, defaults?: IDefaultsObj<TInput, TOutput>) {
    super(runOptions, defaults);
    this.runOptions = runOptions;

    this.initializeHero();
  }

  public get coreSessionPromise(): Promise<ICoreSession> {
    return this.hero[InternalPropertiesSymbol].coreSessionPromise;
  }

  public get sessionIdToExtract(): string | undefined {
    return (this.runOptions as any).extractSessionId ?? process.env.ULX_EXTRACT_SESSION_ID;
  }

  public override get output(): TOutput {
    if (!this._output) {
      this._output = createObservableOutput(this.coreSessionPromise) as unknown as TOutput;
      for (const [key, value] of Object.entries(this.defaults.output || {})) {
        this._output[key] = value;
      }
    }
    return this._output as unknown as TOutput;
  }

  public override set output(value: any | any[]) {
    const output = this._output;
    for (const key of Object.keys(output)) {
      delete output[key];
    }
    Object.assign(this._output, value);
  }

  public get sessionId(): Promise<string> {
    return this.hero.sessionId;
  }

  public execExtractor<T>(
    extractFn:
      | IExtractFn<TInput, TOutput>
      | IExtractElementFn<T, TInput, TOutput>
      | IExtractElementsFn<T, TInput, TOutput>,
    element?: Element | Element[],
  ): Promise<any> {
    const extractorObject = new ExtractorObject<TInput, TOutput>(this);
    let response: any;
    if (Array.isArray(element)) {
      response = (extractFn as IExtractElementsFn<T, TInput, TOutput>)(
        element as Element[],
        extractorObject,
      );
    } else if (element) {
      response = (extractFn as IExtractElementFn<T, TInput, TOutput>)(
        element as Element,
        extractorObject,
      );
    } else {
      response = (extractFn as IExtractFn<TInput, TOutput>)(extractorObject);
    }
    this.#extractorPromises.push(response);
    return response;
  }

  public override async close(closeFn?: () => Promise<void>): Promise<void> {
    await super.close(async () => {
      if (closeFn) await closeFn();
      await Promise.all(this.#extractorPromises).catch(err => err);
      await this.hero.close();
    });
  }

  protected initializeHero(): void {
    const heroOptions: IHeroCreateOptions = {
      ...this.defaults.hero,
      ...this.runOptions,
      input: this.input,
    };
    this.hero = new Hero(heroOptions);
    databoxInternalByHero.set(this.hero, this);
  }

  protected createRunnerObject(): RunnerObject<TInput, TOutput> {
    return new RunnerObject(this);
  }
}

export function getDataboxInternalByHero(hero: Hero): DataboxInternal<any, any> {
  return databoxInternalByHero.get(hero);
}
