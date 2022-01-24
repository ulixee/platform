import ICollectedResource from '@ulixee/hero-interfaces/ICollectedResource';
import RunningHerobox from '../lib/RunningHerobox';
import { HTMLDocument } from 'linkedom/types/html/document';

export default interface IExtractParams {
  input: RunningHerobox['input'];
  output: RunningHerobox['output'];
  collectedFragments: {
    names: string[];
    get(name: string): HTMLDocument;
    html(name: string): string;
  };
  collectedResources: { names: string[]; get(name: string): ICollectedResource };
}
