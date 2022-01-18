import IComponents from '@ulixee/databox/interfaces/IComponents';
import Resource from '@ulixee/hero/lib/Resource';
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
      const fragmentsByName: IExtractParams['collectedFragments'] = {
        names: fragments.map(x => x.name),
        get: hero.getFragment,
      };
      const resourcesByName: IExtractParams['collectedResources'] = {
        names: [],
        get(): Resource {
          return null;
        },
      };

      for (const fragment of fragments) {
        fragmentsByName[fragment.name] = fragment;
      }
      await this.#extractFn({
        input: herobox.input,
        output: herobox.output,
        collectedFragments: fragmentsByName,
        collectedResources: resourcesByName,
      });
    }
  }

  protected createRunningDataboxFn(connectionManager, databoxOptions): Promise<RunningHerobox> {
    return Promise.resolve(new RunningHerobox(connectionManager, databoxOptions));
  }
}
