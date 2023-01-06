// eslint-disable-next-line max-classes-per-file
import '@ulixee/commons/lib/SourceMapSupport';
import Hero, { HeroReplay, IHeroCreateOptions, IHeroReplayCreateOptions } from '@ulixee/hero';
import ICoreSession, { IOutputChangeToRecord } from '@ulixee/hero/interfaces/ICoreSession';
import FunctionInternal from '@ulixee/datastore/lib/FunctionInternal';
import { InternalPropertiesSymbol } from '@ulixee/hero/lib/internal';
import IFunctionSchema from '@ulixee/datastore/interfaces/IFunctionSchema';
import IObservableChange from '@ulixee/datastore/interfaces/IObservableChange';
import { FunctionPluginStatics, IFunctionComponents, IFunctionExecOptions } from '@ulixee/datastore';
import IFunctionContextBase from '@ulixee/datastore/interfaces/IFunctionContext';
import ICrawlerOutputSchema from '@ulixee/datastore/interfaces/ICrawlerOutputSchema';

export * from '@ulixee/datastore';

const pkg = require('./package.json');

export type IHeroFunctionExecOptions<ISchema> = IFunctionExecOptions<ISchema> & IHeroCreateOptions;

declare module '@ulixee/hero/lib/extendables' {
  interface Hero {
    toCrawlerOutput(): Promise<ICrawlerOutputSchema>;
  }
}

export type IHeroFunctionContext<ISchema> = IFunctionContextBase<ISchema> & {
  Hero: typeof Hero;
  HeroReplay: typeof HeroReplay;
};

export type IHeroFunctionComponents<ISchema> = IFunctionComponents<
  ISchema,
  IHeroFunctionContext<ISchema>
>;

@FunctionPluginStatics
export class HeroFunctionPlugin<ISchema extends IFunctionSchema> {
  public static execArgAddons: IHeroCreateOptions;
  public static contextAddons: {
    Hero: typeof Hero;
    HeroReplay: { new (options: IHeroReplayCreateOptions | ICrawlerOutputSchema): HeroReplay };
  };

  public name = pkg.name;
  public version = pkg.version;
  public hero: Hero;
  public heroReplays = new Set<HeroReplay>();

  public functionInternal: FunctionInternal<ISchema, IHeroFunctionExecOptions<ISchema>>;
  public execOptions: IHeroFunctionExecOptions<ISchema>;
  public components: IHeroFunctionComponents<ISchema>;

  private pendingOutputs: IOutputChangeToRecord[] = [];

  constructor(components: IHeroFunctionComponents<ISchema>) {
    this.components = components;
    this.uploadOutputs = this.uploadOutputs.bind(this);
  }

  public async run(
    functionInternal: FunctionInternal<ISchema, IHeroFunctionExecOptions<ISchema>>,
    context: IHeroFunctionContext<ISchema>,
    next: () => Promise<IHeroFunctionContext<ISchema>['outputs']>,
  ): Promise<void> {
    this.execOptions = functionInternal.options;
    this.functionInternal = functionInternal;
    this.functionInternal.onOutputChanges = this.onOutputChanged.bind(this);

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const container = this;
    try {
      const HeroReplayBase = HeroReplay;
      const heroOptions: IHeroCreateOptions = {
        ...this.execOptions,
        input: this.functionInternal.input,
      };

      const HeroBase = Hero;
      // eslint-disable-next-line @typescript-eslint/no-shadow
      context.Hero = class Hero extends HeroBase {
        constructor(options?: IHeroCreateOptions) {
          if (container.hero) {
            throw new Error('Multiple Hero instances are not supported in a Datastore Function.');
          }
          super({ ...heroOptions, ...(options ?? {}) });
          container.hero = this;
          this.toCrawlerOutput = async (): Promise<ICrawlerOutputSchema> => {
            return {
              sessionId: await this.sessionId,
              crawler: 'Hero',
              version: this.version,
            };
          };
          void this[InternalPropertiesSymbol].coreSessionPromise.then(container.uploadOutputs);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-shadow
      context.HeroReplay = class HeroReplay extends HeroReplayBase {
        constructor(options?: IHeroReplayCreateOptions | ICrawlerOutputSchema) {
          super({
            replaySessionId: ((options as ICrawlerOutputSchema) ?? {}).sessionId,
            ...heroOptions,
            ...(options ?? {}),
          });
          container.heroReplays.add(this);
        }
      };

      await next();
    } finally {
      await Promise.all([this.hero, ...this.heroReplays].filter(Boolean).map(x => x.close().catch(() => null)));
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

  protected uploadOutputs(): void {
    if (!this.pendingOutputs.length || !this.coreSessionPromise) return;

    const records = [...this.pendingOutputs];
    this.pendingOutputs.length = 0;
    this.coreSessionPromise.then(x => x.recordOutput(records)).catch(() => null);
  }

  private onOutputChanged(changes: IObservableChange[]): void {
    const changesToRecord: IOutputChangeToRecord[] = changes.map(change => ({
      type: change.type as string,
      value: change.value,
      path: JSON.stringify(change.path),
      timestamp: Date.now(),
    }));

    this.pendingOutputs.push(...changesToRecord);

    this.uploadOutputs();
  }
}

const pluginInstancesByHero: WeakMap<Hero, HeroFunctionPlugin<any>> = new WeakMap();
export function getDatastoreForHeroPlugin(hero: Hero): HeroFunctionPlugin<any> {
  return pluginInstancesByHero.get(hero);
}
