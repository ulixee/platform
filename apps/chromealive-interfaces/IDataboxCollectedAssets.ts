import IDetachedElement from '@ulixee/hero-interfaces/IDetachedElement';
import IDetachedResource from '@ulixee/hero-interfaces/IDetachedResource';
import IDataSnippet from '@ulixee/hero-interfaces/IDataSnippet';
import ISourceCodeReference from '@ulixee/hero-interfaces/ISourceCodeReference';

export default interface IDataboxCollectedAssetsResponse {
  detachedElements: (IDetachedElement & ISourceCodeReference)[];
  detachedResources: (IDetachedResource & ISourceCodeReference)[];
  snippets: (IDataSnippet & ISourceCodeReference)[];
}
