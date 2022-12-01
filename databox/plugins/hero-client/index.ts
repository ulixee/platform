import '@ulixee/commons/lib/SourceMapSupport';
import Hero, { HeroReplay, IHeroCreateOptions, IHeroReplayCreateOptions } from '@ulixee/hero';
import ICoreSession from '@ulixee/hero/interfaces/ICoreSession';
import FunctionInternal from '@ulixee/databox/lib/FunctionInternal';
import { InternalPropertiesSymbol } from '@ulixee/hero/lib/internal';
import IFunctionSchema from '@ulixee/databox/interfaces/IFunctionSchema';
import IObservableChange from '@ulixee/databox/interfaces/IObservableChange';
import { FunctionPluginStatics, IFunctionComponents, IFunctionExecOptions } from '@ulixee/databox';
import IFunctionContextBase from '@ulixee/databox/interfaces/IFunctionContext';
import { IFunctionLifecycle } from '@ulixee/databox/interfaces/IFunctionPlugin';

export * from '@ulixee/databox';

const pkg = require('./package.json');

export type IHeroFunctionExecOptions<ISchema> = IFunctionExecOptions<ISchema> & IHeroCreateOptions;

export type IHeroFunctionContext<ISchema> = IFunctionContextBase<ISchema> & {
  hero: Hero;
};

export type IHeroReplayFunctionContext<ISchema> = IFunctionContextBase<ISchema> & {
  heroReplay: HeroReplay;
};

type IHeroFunctionComponentsAddons = {
  defaultHeroOptions?: IHeroCreateOptions;
};

export type IHeroFunctionComponents<ISchema> = IFunctionComponents<
  ISchema,
  IHeroFunctionContext<ISchema>,
  IFunctionContextBase<ISchema>,
  IHeroReplayFunctionContext<ISchema>
> &
  IHeroFunctionComponentsAddons;

@FunctionPluginStatics
export class HeroFunctionPlugin<ISchema extends IFunctionSchema> {
  public static execArgAddons: IHeroCreateOptions;
  public static componentAddons: IHeroFunctionComponentsAddons;
  public static runContextAddons: {
    hero: Hero;
  };

  public static afterRunContextAddons: {
    heroReplay: HeroReplay;
  };

  public name = pkg.name;
  public version = pkg.version;
  public hero: Hero;
  public heroReplay: HeroReplay;

  public functionInternal: FunctionInternal<ISchema, IHeroFunctionExecOptions<ISchema>>;

  public execOptions: IHeroFunctionExecOptions<ISchema>;
  public components: IHeroFunctionComponents<ISchema>;

  constructor(components: IHeroFunctionComponents<ISchema>) {
    this.components = components;
  }

  public async run(
    functionInternal: FunctionInternal<ISchema, IHeroFunctionExecOptions<ISchema>>,
    lifecycle: IFunctionLifecycle<
      ISchema,
      IHeroFunctionContext<ISchema>,
      IFunctionContextBase<ISchema>,
      IHeroReplayFunctionContext<ISchema>
    >,
    next: () => Promise<ISchema['output']>,
  ): Promise<void> {
    this.execOptions = functionInternal.options;
    this.functionInternal = functionInternal;
    this.functionInternal.onOutputChanges = this.onOutputChanged.bind(this);

    try {
      lifecycle.run.isEnabled = !this.replaySessionId;

      if (lifecycle.run.isEnabled) {
        this.initializeHero();
        lifecycle.run.context.hero = this.hero;
      }

      if (lifecycle.afterRun.isEnabled) {
        this.initializeHeroReplay();
        lifecycle.afterRun.context.heroReplay = this.heroReplay;
      }
      await next();
    } finally {
      await this.hero?.close();
      await this.heroReplay?.close();
    }
  }

  // INTERNALS ///////////////////////

  public get coreSessionPromise(): Promise<ICoreSession> | undefined {
    if (!this.hero) return;
    return this.hero[InternalPropertiesSymbol].coreSessionPromise;
  }

  public get replaySessionId(): string | undefined {
    return this.execOptions.replaySessionId ?? process.env.ULX_REPLAY_SESSION_ID;
  }

  private initializeHero(): void {
    const heroOptions: IHeroCreateOptions = {
      ...(this.components.defaultHeroOptions ?? {}),
      ...this.execOptions,
      input: this.functionInternal.input,
    };
    this.hero = new Hero(heroOptions);
    pluginInstancesByHero.set(this.hero, this);
  }

  private initializeHeroReplay(): void {
    if (this.hero) {
      this.heroReplay = new HeroReplay({ hero: this.hero });
    } else {
      const heroOptions: IHeroReplayCreateOptions = {
        ...(this.components.defaultHeroOptions ?? {}),
        ...this.execOptions,
        input: this.functionInternal.input,
      };
      this.heroReplay = new HeroReplay(heroOptions);
    }
  }

  private onOutputChanged(changes: IObservableChange[]): void {
    const changesToRecord = changes.map(change => ({
      type: change.type as string,
      value: change.value,
      path: JSON.stringify(change.path),
      timestamp: Date.now(),
    }));

    this.coreSessionPromise
      ?.then(coreSession => coreSession.recordOutput(changesToRecord))
      .catch(() => null);
  }
}

const pluginInstancesByHero: WeakMap<Hero, HeroFunctionPlugin<any>> = new WeakMap();
export function getDataboxForHeroPlugin(hero: Hero): HeroFunctionPlugin<any> {
  return pluginInstancesByHero.get(hero);
}
