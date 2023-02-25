import IRunnerComponents from './IRunnerComponents';
import ITableComponents from './ITableComponents';
import IDatastoreComponents from './IDatastoreComponents';

export default interface IDatastoreMetadata
  extends Omit<
    IDatastoreComponents<any, any, any>,
    'authenticateIdentity' | 'crawlers' | 'runners' | 'tables'
  > {
  coreVersion: string;
  runnersByName: {
    [name: string]: {
      corePlugins: { [name: string]: string };
      remoteRunner?: string;
      remoteSource?: string;
      remoteDatastoreVersionHash?: string;
    } & Omit<IRunnerComponents<any, any>, 'run'>;
  };
  crawlersByName: {
    [name: string]: {
      corePlugins: { [name: string]: string };
      remoteCrawler?: string;
      remoteSource?: string;
      remoteDatastoreVersionHash?: string;
    } & Omit<IRunnerComponents<any, any>, 'run'>;
  };
  tablesByName: {
    [name: string]: {
      remoteTable?: string;
      remoteSource?: string;
      remoteDatastoreVersionHash?: string;
    } & Omit<ITableComponents<any, any>, 'seedlings'>;
  };
}
