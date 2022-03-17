import ICollectedElement from '@ulixee/hero-interfaces/ICollectedElement';
import ICollectedResource from '@ulixee/hero-interfaces/ICollectedResource';
import ICollectedSnippet from '@ulixee/hero-interfaces/ICollectedSnippet';
import ISourceCodeReference from '@ulixee/hero-interfaces/ISourceCodeReference';

export default interface IDataboxCollectedAssetsResponse {
  collectedElements: (ICollectedElement & ISourceCodeReference)[];
  collectedSnippets: (ICollectedSnippet & ISourceCodeReference)[];
  collectedResources: (ICollectedResource & ISourceCodeReference)[];
}
