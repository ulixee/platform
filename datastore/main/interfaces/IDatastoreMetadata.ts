import IExtractorComponents from './IExtractorComponents';
import ITableComponents from './ITableComponents';
import IDatastoreComponents from './IDatastoreComponents';

export default interface IDatastoreMetadata
  extends Omit<
    IDatastoreComponents<any, any, any>,
    'authenticateIdentity' | 'crawlers' | 'extractors' | 'tables'
  > {
  coreVersion: string;
  extractorsByName: {
    [name: string]: {
      corePlugins: { [name: string]: string };
      remoteExtractor?: string;
      remoteSource?: string;
      remoteDatastoreVersionHash?: string;
    } & Omit<IExtractorComponents<any, any>, 'run'>;
  };
  crawlersByName: {
    [name: string]: {
      corePlugins: { [name: string]: string };
      remoteCrawler?: string;
      remoteSource?: string;
      remoteDatastoreVersionHash?: string;
    } & Omit<IExtractorComponents<any, any>, 'run'>;
  };
  tablesByName: {
    [name: string]: {
      remoteTable?: string;
      remoteSource?: string;
      remoteDatastoreVersionHash?: string;
    } & Omit<ITableComponents<any, any>, 'seedlings'>;
  };
}
