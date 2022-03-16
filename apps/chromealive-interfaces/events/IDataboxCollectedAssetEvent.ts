import ICollectedElement from '@ulixee/hero-interfaces/ICollectedElement';
import ICollectedResource from '@ulixee/hero-interfaces/ICollectedResource';
import ICollectedSnippet from '@ulixee/hero-interfaces/ICollectedSnippet';
import ISourceCodeReference from '@ulixee/hero-interfaces/ISourceCodeReference';

export default interface IDataboxCollectedAssetEvent {
  collectedResource?: ICollectedResource & ISourceCodeReference;
  collectedSnippet?: ICollectedSnippet & ISourceCodeReference;
  collectedElement?: ICollectedElement & ISourceCodeReference;
}
