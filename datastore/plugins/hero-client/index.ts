// eslint-disable-next-line max-classes-per-file
import '@ulixee/commons/lib/SourceMapSupport';
import Hero, { HeroReplay, IHeroCreateOptions, IHeroReplayCreateOptions } from '@ulixee/hero';
import ICoreSession, { IOutputChangeToRecord } from '@ulixee/hero/interfaces/ICoreSession';
import RunnerInternal from '@ulixee/datastore/lib/RunnerInternal';
import { InternalPropertiesSymbol } from '@ulixee/hero/lib/internal';
import IRunnerSchema from '@ulixee/datastore/interfaces/IRunnerSchema';
import IObservableChange from '@ulixee/datastore/interfaces/IObservableChange';
import {
  Crawler,
  IRunnerComponents,
  IRunnerExecOptions,
  RunnerPluginStatics,
} from '@ulixee/datastore';
import IRunnerContextBase from '@ulixee/datastore/interfaces/IRunnerContext';
import ICrawlerOutputSchema from '@ulixee/datastore/interfaces/ICrawlerOutputSchema';

export * from '@ulixee/datastore';

const pkg = require('./package.json');

export type IHeroRunnerExecOptions<ISchema> = IRunnerExecOptions<ISchema> & IHeroCreateOptions;

declare module '@ulixee/hero/lib/extendables' {
  interface Hero {
    toCrawlerOutput(): Promise<ICrawlerOutputSchema>;
  }
}

export type HeroReplayCrawler = typeof HeroReplay & {
  new (options: IHeroReplayCreateOptions | ICrawlerOutputSchema): HeroReplay;
  fromCrawler<T extends Crawler>(crawler: T, options?: T['runArgsType']): Promise<HeroReplay>;
};

export type IHeroRunnerContext<ISchema> = IRunnerContextBase<ISchema> & {
  Hero: typeof Hero;
  HeroReplay: HeroReplayCrawler;
};

export type IHeroRunnerComponents<ISchema> = IRunnerComponents<
  ISchema,
  IHeroRunnerContext<ISchema>
>;

@RunnerPluginStatics
export class HeroRunnerPlugin<ISchema extends IRunnerSchema> {
  public static execArgAddons: IHeroCreateOptions;
  public static contextAddons: {
    Hero: typeof Hero;
    HeroReplay: HeroReplayCrawler;
  };

  public name = pkg.name;
  public version = pkg.version;
  public hero: Hero;
  public heroReplays = new Set<HeroReplay>();

  public runnerInternal: RunnerInternal<ISchema, IHeroRunnerExecOptions<ISchema>>;
  public execOptions: IHeroRunnerExecOptions<ISchema>;
  public components: IHeroRunnerComponents<ISchema>;

  private pendingOutputs: IOutputChangeToRecord[] = [];
  private pendingUploadPromises = new Set<Promise<void>>();
  private coreSessionPromise: Promise<ICoreSession>;

  constructor(components: IHeroRunnerComponents<ISchema>) {
    this.components = components;
    this.uploadOutputs = this.uploadOutputs.bind(this);
  }

  public async run(
    runnerInternal: RunnerInternal<ISchema, IHeroRunnerExecOptions<ISchema>>,
    context: IHeroRunnerContext<ISchema>,
    next: () => Promise<IHeroRunnerContext<ISchema>['outputs']>,
  ): Promise<void> {
    this.execOptions = runnerInternal.options;
    this.runnerInternal = runnerInternal;
    this.runnerInternal.onOutputChanges = this.onOutputChanged.bind(this);

    const needsClose: (() => Promise<void>)[] = [];

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const container = this;
    try {
      const HeroReplayBase = HeroReplay;
      const { input, affiliateId, payment, authentication, ...heroApplicableOptions } =
        runnerInternal.options as IRunnerExecOptions<ISchema>;

      const heroOptions: IHeroCreateOptions = {
        ...heroApplicableOptions,
        input: this.runnerInternal.input,
      };

      const HeroBase = Hero;

      // eslint-disable-next-line @typescript-eslint/no-shadow
      context.Hero = class Hero extends HeroBase {
        constructor(options: IHeroCreateOptions = {}) {
          if (container.hero) {
            throw new Error('Multiple Hero instances are not supported in a Datastore Runner.');
          }
          super({ ...heroOptions, ...options });
          container.hero = this;
          this.toCrawlerOutput = async (): Promise<ICrawlerOutputSchema> => {
            return {
              sessionId: await this.sessionId,
              crawler: 'Hero',
              version: this.version,
            };
          };
          void this.once('connected', container.onConnected.bind(container, this));
          needsClose.push(super.close.bind(this));
        }

        // don't close until the end
        override close(): Promise<void> {
          return Promise.resolve();
        }
      };
      // eslint-disable-next-line @typescript-eslint/no-shadow
      context.HeroReplay = class HeroReplay extends HeroReplayBase {
        constructor(options: IHeroReplayCreateOptions | ICrawlerOutputSchema = {}) {
          // extract sessionId so that we don't try to reload
          const { sessionId, crawler, version, ...replayOptions } = options as any;

          const replaySessionId =
            sessionId || heroOptions.replaySessionId || process.env.ULX_REPLAY_SESSION_ID;

          super({
            ...heroOptions,
            ...replayOptions,
            replaySessionId,
          });
          container.heroReplays.add(this);
          this.once('connected', container.onConnected.bind(container, this));
          needsClose.push(super.close.bind(this));
        }

        // don't close until the end
        override close(): Promise<void> {
          return Promise.resolve();
        }

        static async fromCrawler<T extends Crawler>(
          crawler: T,
          options: T['runArgsType'] = {},
        ): Promise<HeroReplay> {
          if (heroOptions.replaySessionId) return new context.HeroReplay(heroOptions);
          const crawl = await context.crawl(crawler, options);
          return new context.HeroReplay(crawl);
        }
      };

      await next();

      // need to allow an immediate for directly emitted outputs to register
      await new Promise(setImmediate);
      await Promise.all(this.pendingUploadPromises);
    } finally {
      await Promise.allSettled(needsClose.map(x => x()));
    }
  }

  // INTERNALS ///////////////////////

  protected onConnected(source: Hero | HeroReplay): void {
    const coreSessionPromise = source[InternalPropertiesSymbol].coreSessionPromise;
    this.coreSessionPromise = coreSessionPromise;
    this.registerSessionClose(coreSessionPromise).catch(() => null);
    this.uploadOutputs();
  }

  protected async registerSessionClose(coreSessionPromise: Promise<ICoreSession>): Promise<void> {
    try {
      const coreSession = await coreSessionPromise;
      if (!coreSession) return;
      if (this.execOptions.trackMetadata) {
        this.execOptions.trackMetadata('heroSessionId', coreSession.sessionId, this.name);
      }
      coreSession.once('close', () => {
        if (this.coreSessionPromise === coreSessionPromise) this.coreSessionPromise = null;
      });
    } catch (err) {
      console.error(err);
      if (this.coreSessionPromise === coreSessionPromise) this.coreSessionPromise = null;
    }
  }

  protected uploadOutputs(): void {
    if (!this.pendingOutputs.length || !this.coreSessionPromise) return;

    const records = [...this.pendingOutputs];
    this.pendingOutputs.length = 0;
    const promise = this.coreSessionPromise.then(x => x.recordOutput(records)).catch(() => null);

    this.pendingUploadPromises.add(promise);
    void promise.then(() => this.pendingUploadPromises.delete(promise));
  }

  private onOutputChanged(index: number, changes: IObservableChange[]): void {
    const changesToRecord: IOutputChangeToRecord[] = changes.map(change => ({
      type: change.type as string,
      value: change.value,
      path: JSON.stringify([index, ...change.path]),
      timestamp: Date.now(),
    }));

    this.pendingOutputs.push(...changesToRecord);

    this.uploadOutputs();
  }
}
