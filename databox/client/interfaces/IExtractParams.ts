/// <reference lib="DOM" />
/// <reference lib="DOM.Iterable" />
import ICollectedResource from '@ulixee/hero-interfaces/ICollectedResource';
import ICollectedFragment from '@ulixee/hero-interfaces/ICollectedFragment';
import DataboxInteracting from '../lib/DataboxInteracting';

export default interface IExtractParams {
  input: DataboxInteracting['input'];
  output: DataboxInteracting['output'];
  collectedFragments: {
    getMeta(name: string): Promise<ICollectedFragment[]>;
    get(name: string): Promise<DocumentFragment>;
    getAll(name: string): Promise<DocumentFragment[]>;
  };
  collectedResources: {
    get(name: string): Promise<ICollectedResource>;
    getAll(name: string): Promise<ICollectedResource[]>;
  };
}
