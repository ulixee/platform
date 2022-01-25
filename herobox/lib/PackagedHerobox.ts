import IComponents from '@ulixee/databox/interfaces/IComponents';
import ICollectedResource from '@ulixee/hero-interfaces/ICollectedResource';
import PackagedDatabox from '@ulixee/databox';
import RunningHerobox from './RunningHerobox';
import IExtractParams from '../interfaces/IExtractParams';
import CollectedFragments from './CollectedFragments';

type IScriptFn = (herobox: RunningHerobox) => void | Promise<void>;
type IExtractFn = (extract: IExtractParams) => void | Promise<void>;

export default class PackagedHerobox extends PackagedDatabox {
  #interactFn: IScriptFn;
  #extractFn: IExtractFn;

  constructor(scriptFn: IScriptFn, otherComponents: Omit<IComponents, 'scriptFn'> = {}) {
    super(scriptFn, otherComponents);
    this.#interactFn = scriptFn;
  }

  public extract(extractFn: IExtractFn): PackagedHerobox {
    this.#extractFn = extractFn;
    return this;
  }

  protected async runScript(): Promise<void> {
    const herobox = this.runningDatabox as RunningHerobox;
    const extractSessionId =
      (herobox.queryOptions as any).extractSessionId ?? process.env.HERO_EXTRACT_SESSION_ID;

    if (!extractSessionId) {
      await this.#interactFn(herobox);
    }
    if (this.#extractFn) {
      const { hero } = herobox;
      const sessionId = extractSessionId ?? (await hero.sessionId);

      const collectedResources: IExtractParams['collectedResources'] = {
        async get(name: string): Promise<ICollectedResource> {
          const resources = await hero.getCollectedResources(sessionId, name);
          if (resources.length) return resources[0];
          return null;
        },
        getAll(name: string): Promise<ICollectedResource[]> {
          return hero.getCollectedResources(sessionId, name);
        },
      };
      await this.#extractFn({
        input: herobox.input,
        output: herobox.output,
        collectedFragments: new CollectedFragments(
          hero.getCollectedFragments.bind(hero, sessionId),
        ),
        collectedResources,
      });
    }
  }

  protected createRunningDataboxFn(connectionManager, databoxOptions): Promise<RunningHerobox> {
    return Promise.resolve(new RunningHerobox(connectionManager, databoxOptions));
  }
}
