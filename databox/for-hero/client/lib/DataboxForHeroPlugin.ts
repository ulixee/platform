import Hero, { HeroReplay, IHeroCreateOptions, IHeroReplayCreateOptions } from '@ulixee/hero';
import { DataboxObject } from '@ulixee/databox';
import ICoreSession from '@ulixee/hero/interfaces/ICoreSession';
import IDataboxPlugin from '@ulixee/databox-interfaces/IDataboxPlugin';
import DataboxInternal from '@ulixee/databox/lib/DataboxInternal';
import { InternalPropertiesSymbol } from '@ulixee/hero/lib/internal';
import IDataboxSchema from '@ulixee/databox-interfaces/IDataboxSchema';
import IObservableChange from '@ulixee/databox/interfaces/IObservableChange';
import IDataboxForHeroExecOptions from '../interfaces/IDataboxForHeroExecOptions';
import IComponents, { IDefaultsObj } from '../interfaces/IComponents';
import IDataboxObject, { IDataboxObjectForReplay } from '../interfaces/IDataboxObject';

const pkg = require('../package.json');

const pluginInstancesByHero: WeakMap<Hero, DataboxForHeroPlugin<any>> = new WeakMap();

export default class DataboxForHeroPlugin<ISchema extends IDataboxSchema>
  implements IDataboxPlugin<ISchema>
{
  public name = pkg.name;
  public version = pkg.version;
  public hero: Hero;
  public heroReplay: HeroReplay;

  public databoxInternal: DataboxInternal<ISchema>;

  private execOptions: IDataboxForHeroExecOptions<ISchema>;
  private defaults: IDefaultsObj<ISchema>;
  private components: IComponents<ISchema>;

  constructor(components: IComponents<ISchema>) {
    this.components = components;
  }

  public onExec(
    databoxInternal: DataboxInternal<ISchema>,
    execOptions: IDataboxForHeroExecOptions<ISchema>,
    defaults: IDefaultsObj<ISchema>,
  ): void {
    this.databoxInternal = databoxInternal;
    this.databoxInternal.onOutputChanges = this.onOutputChanged.bind(this);
    this.execOptions = execOptions;
    this.defaults = defaults;
  }

  public get shouldRun(): boolean {
    return !this.replaySessionId;
  }

  public onBeforeRun(databoxObject: IDataboxObject<ISchema>): void {
    this.initializeHero();
    databoxObject.hero = this.hero;
  }

  public async onBeforeClose(): Promise<void> {
    if (!this.components.onAfterHeroCompletes) return;

    this.initializeHeroReplay();
    const databoxObject = new DataboxObject<ISchema>(
      this.databoxInternal,
    ) as unknown as IDataboxObjectForReplay<ISchema>;
    databoxObject.heroReplay = this.heroReplay;

    await this.components.onAfterHeroCompletes(databoxObject);
  }

  public async onClose(): Promise<void> {
    await this.hero?.close();
    await this.heroReplay?.close();
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
      ...this.defaults.hero,
      ...this.execOptions,
      input: this.databoxInternal.input,
    };
    this.hero = new Hero(heroOptions);
    pluginInstancesByHero.set(this.hero, this);
  }

  private initializeHeroReplay(): void {
    if (this.hero) {
      this.heroReplay = new HeroReplay({ hero: this.hero });
    } else {
      const heroOptions: IHeroReplayCreateOptions = {
        ...(this.defaults.hero as IHeroReplayCreateOptions),
        ...this.execOptions,
        input: this.databoxInternal.input,
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

export function getDataboxForHeroPlugin(hero: Hero): DataboxForHeroPlugin<any> {
  return pluginInstancesByHero.get(hero);
}
