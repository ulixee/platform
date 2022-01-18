import IComponents from '@ulixee/databox/interfaces/IComponents';
import ICollectedResource from '@ulixee/hero-interfaces/ICollectedResource';
import PackagedDatabox from '@ulixee/databox';
import RunningHerobox from './RunningHerobox';
import IExtractParams from '../interfaces/IExtractParams';

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
      const fragments = await hero.importFragments(sessionId);
      const resources = await hero.getCollectedResources(sessionId);
      const fragmentsByName: IExtractParams['collectedFragments'] = {
        names: fragments.map(x => x.name),
        get: hero.getFragment,
      };

      const resourcesByName: { [name: string]: ICollectedResource } = {};
      const collectedResources: IExtractParams['collectedResources'] = {
        names: [],
        get(name) {
          return resourcesByName[name];
        },
      };
      for (const resource of resources) {
        resourcesByName[resource.name] = resource.resource;
      }

      await this.#extractFn({
        input: herobox.input,
        output: herobox.output,
        collectedFragments: fragmentsByName,
        collectedResources,
      });
    }
  }

  protected createRunningDataboxFn(connectionManager, databoxOptions): Promise<RunningHerobox> {
    return Promise.resolve(new RunningHerobox(connectionManager, databoxOptions));
  }
}
