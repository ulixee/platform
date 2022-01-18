import RunningHerobox from '../lib/RunningHerobox';
import Resource from '@ulixee/hero/lib/Resource';
import Hero from '@ulixee/hero';

export default interface IExtractParams {
  input: RunningHerobox['input'];
  output: RunningHerobox['output'];
  collectedFragments: { names: string[]; get: Hero['getFragment'] };
  collectedResources: { names: string[]; get(name: string): Resource };
}
