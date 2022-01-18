import ICollectedResource from '@ulixee/hero-interfaces/ICollectedResource';
import RunningHerobox from '../lib/RunningHerobox';
import Hero from '@ulixee/hero';

export default interface IExtractParams {
  input: RunningHerobox['input'];
  output: RunningHerobox['output'];
  collectedFragments: { names: string[]; get: Hero['getFragment'] };
  collectedResources: { names: string[]; get(name: string): ICollectedResource };
}
