import { DOMParser } from 'linkedom';
import { HTMLDocument } from 'linkedom/types/html/document';
import IComponents from '@ulixee/databox/interfaces/IComponents';
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
      const fragments = await hero.getCollectedFragments(sessionId);
      const resources = await hero.getCollectedResources(sessionId);
      const domParser = new DOMParser();
      const fragmentsByName: { [name: string]: HTMLDocument } = {};
      for (const [name, fragment] of Object.entries(fragments)) {
        fragmentsByName[name] = domParser.parseFromString(fragment, 'text/html');
      }
      const collectedFragments: IExtractParams['collectedFragments'] = {
        names: Object.keys(fragments),
        get(name: string) {
          return fragmentsByName[name];
        },
        html(name: string) {
          return fragments[name];
        },
      };

      const collectedResources: IExtractParams['collectedResources'] = {
        names: Object.keys(resources),
        get(name) {
          return resources[name];
        },
      };
      await this.#extractFn({
        input: herobox.input,
        output: herobox.output,
        collectedFragments,
        collectedResources,
      });
    }
  }

  protected createRunningDataboxFn(connectionManager, databoxOptions): Promise<RunningHerobox> {
    return Promise.resolve(new RunningHerobox(connectionManager, databoxOptions));
  }
}
