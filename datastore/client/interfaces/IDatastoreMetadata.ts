import IFunctionComponents from './IFunctionComponents';
import ITableComponents from './ITableComponents';

export default interface IDatastoreMetadata {
  name?: string;
  description?: string;
  coreVersion: string;
  remoteDatastores?: Record<string, string>;
  paymentAddress?: string;
  giftCardIssuerIdentity?: string;
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
