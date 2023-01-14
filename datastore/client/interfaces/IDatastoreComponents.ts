import Crawler from '../lib/Crawler';
import Function from '../lib/Function';
import Table from '../lib/Table';
import CreditsTable from '../lib/CreditsTable';

export default interface IDatastoreComponents<
  TTable extends TTables<any>,
  TFunction extends TFunctions<any>,
  TCrawler extends TCrawlers<any>,
> {
  name?: string;
  description?: string;
  remoteDatastores?: { [source: string]: string };
  tables?: TTable & { credits?: CreditsTable };
  functions?: TFunction;
  crawlers?: TCrawler;
  paymentAddress?: string;
  adminIdentities?: string[];
  authenticateIdentity?(identity: string, nonce: string): Promise<boolean> | boolean;
}

export type TFunctions<T = any> = T extends Function
  ? {
      [K in keyof T]: T[K];
    }
  : never;

export type TTables<T = any> = T extends Table
  ? {
      [K in keyof T]: T[K];
    }
  : never;

export type TCrawlers<T = any> = T extends Crawler
  ? {
      [K in keyof T]: T[K];
    }
  : never;
