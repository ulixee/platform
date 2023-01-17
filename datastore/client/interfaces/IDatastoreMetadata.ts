import IFunctionComponents from './IFunctionComponents';
import ITableComponents from './ITableComponents';
import IDatastoreComponents from './IDatastoreComponents';

export default interface IDatastoreMetadata
  extends Omit<
    IDatastoreComponents<any, any, any>,
    'authenticateIdentity' | 'crawlers' | 'functions' | 'tables'
  > {
  coreVersion: string;
  functionsByName: {
    [name: string]: {
      corePlugins: { [name: string]: string };
      remoteFunction?: string;
      remoteSource?: string;
      remoteDatastoreVersionHash?: string;
    } & Omit<IFunctionComponents<any, any>, 'run'>;
  };
  crawlersByName: {
    [name: string]: {
      corePlugins: { [name: string]: string };
    } & Omit<IFunctionComponents<any, any>, 'run'>;
  };
  tablesByName: {
    [name: string]: {
      remoteTable?: string;
      remoteSource?: string;
      remoteDatastoreVersionHash?: string;
    } & Omit<ITableComponents<any, any>, 'seedlings'>;
  };
}
