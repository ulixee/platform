import IDetachedElement from '@ulixee/hero-interfaces/IDetachedElement';
import IDetachedResource from '@ulixee/hero-interfaces/IDetachedResource';
import IDataSnippet from '@ulixee/hero-interfaces/IDataSnippet';
import ISourceCodeReference from '@ulixee/hero-interfaces/ISourceCodeReference';

export default interface IDataboxCollectedAssetEvent {
  detachedResource?: IDetachedResource & ISourceCodeReference;
  detachedElement?: IDetachedElement & ISourceCodeReference;
  snippet?: IDataSnippet & ISourceCodeReference;
}
