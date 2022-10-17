import Hero, { HeroExtractor, IHeroCreateOptions, IHeroExtractorCreateOptions } from '@ulixee/hero';
import { RunnerObject } from '@ulixee/databox';
import ICoreSession from '@ulixee/hero/interfaces/ICoreSession';
import IDataboxPlugin from "@ulixee/databox-interfaces/IDataboxPlugin";
import DataboxInternal from "@ulixee/databox/lib/DataboxInternal";
import { InternalPropertiesSymbol } from '@ulixee/hero/lib/internal';
import IDataboxForHeroExecOptions from "../interfaces/IDataboxForHeroExecOptions";
import IRunnerObject from "../interfaces/IRunnerObject";
import { createObservableOutput } from './Output';
import IComponents, {
  IDefaultsObj,
} from '../interfaces/IComponents';

const pkg = require('../package.json');

const pluginInstancesByHero: WeakMap<Hero, DataboxForHeroPlugin<any, any>> = new WeakMap();

export default class DataboxForHeroPlugin<TInput, TOutput> implements IDataboxPlugin<TInput, TOutput> {
  #extractorPromises: Promise<any>[] = [];

  public name = pkg.name;
  public version = pkg.version;
  public hero: Hero;
  public heroExtractor: HeroExtractor;
  public databoxInternal: DataboxInternal<TInput, TOutput>;

  private execOptions: IDataboxForHeroExecOptions;
  private defaults: IDefaultsObj<TInput, TOutput>;
  private components:  IComponents<any, any>;

  constructor(components: IComponents<any, any>) {
    this.components = components;
  }

  public onExec(
    databoxInternal: DataboxInternal<TInput, TOutput>,
    execOptions: IDataboxForHeroExecOptions, 
    defaults: IDefaultsObj<TInput, TOutput>, 
  ): void {
    this.databoxInternal = databoxInternal;
    this.execOptions = execOptions;
    this.defaults = defaults;
  }

  public get shouldRun(): boolean {
    return !this.previousSessionId;
  }

  public onBeforeRun(runnerObject: IRunnerObject<TInput, TOutput, Hero>): void {
    this.initializeHero();
    runnerObject.hero = this.hero;
    runnerObject.sessionId = this.sessionId;
    Object.defineProperty(runnerObject, 'output', {
      get: () => this.output,
      set: value => {
        this.output = value;
      }
    });
  }

  public async onBeforeClose(): Promise<void> {
    if (!this.components.runExtractor) return;

    this.initializeHeroExtractor();
    const runnerObject = new RunnerObject<TInput, TOutput>(this.databoxInternal) as IRunnerObject<TInput, TOutput, HeroExtractor>;
    runnerObject.hero = this.heroExtractor;
    runnerObject.sessionId = this.sessionId;
    Object.defineProperty(runnerObject, 'output', {
      get: () => this.output,
      set: value => {
        this.output = value;
      }
    });

    await this.components.runExtractor(runnerObject);
  }

  public async onClose(): Promise<void> {
    await Promise.all(this.#extractorPromises).catch(err => err);
    await this.hero?.close();
    await this.heroExtractor?.close();
  }

  // INTERNALS ///////////////////////

  public get coreSessionPromise(): Promise<ICoreSession> {
    if (!this.hero) return;
    return this.hero[InternalPropertiesSymbol].coreSessionPromise;
  }

  public get previousSessionId(): string | undefined {
    return this.execOptions.previousSessionId ?? process.env.ULX_OLD_SESSION_ID;
  }

  public get output(): TOutput {
    const databoxInternal = this.databoxInternal;
    if (!databoxInternal.output) {
      databoxInternal.output = createObservableOutput(this.coreSessionPromise) as unknown as TOutput;
      for (const [key, value] of Object.entries(this.defaults.output || {})) {
        databoxInternal.output[key] = value;
      }
    }
    return databoxInternal.output as unknown as TOutput;
  }

  public set output(value: any | any[]) {
    const databoxInternal = this.databoxInternal;
    const output = databoxInternal.output;
    for (const key of Object.keys(output)) {
      delete output[key];
    }
    Object.assign(databoxInternal.output, value);
  }

  public get sessionId(): IRunnerObject<TInput, TOutput, Hero>['sessionId'] {
    return this.hero?.sessionId;
  }

  private initializeHero(): void {
    const heroOptions: IHeroCreateOptions = {
      ...this.defaults.hero,
      ...this.execOptions,
      input: this.databoxInternal.input,
    };
    this.hero = new Hero(heroOptions);
    pluginInstancesByHero.set(this.hero, this);
  }

  private initializeHeroExtractor(): void {
    const heroOptions: IHeroExtractorCreateOptions = {
      ...this.defaults.hero as IHeroExtractorCreateOptions,
      ...this.execOptions,
      input: this.databoxInternal.input,
      hero: this.hero,
    };
    this.heroExtractor = new HeroExtractor(heroOptions);
  }
}

export function getDataboxForHeroPlugin(hero: Hero): DataboxForHeroPlugin<any, any> {
  return pluginInstancesByHero.get(hero);
}
