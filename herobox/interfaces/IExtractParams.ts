import ICollectedResource from '@ulixee/hero-interfaces/ICollectedResource';
import ICollectedFragment from '@ulixee/hero-interfaces/ICollectedFragment';
import RunningHerobox from '../lib/RunningHerobox';

export default interface IExtractParams {
  input: RunningHerobox['input'];
  output: RunningHerobox['output'];
  collectedFragments: {
    getMeta(name: string): Promise<ICollectedFragment[]>;
    get(name: string): Promise<globalThis.DocumentFragment>;
    getAll(name: string): Promise<globalThis.DocumentFragment[]>;
  };
  collectedResources: {
    get(name: string): Promise<ICollectedResource>;
    getAll(name: string): Promise<ICollectedResource[]>;
  };
}
