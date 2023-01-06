import Crawler from '../lib/Crawler';
import Function from '../lib/Function';
import Table from '../lib/Table';

export default interface IDatastoreComponents<
  TTable extends TTables<any>,
  TFunction extends TFunctions<any>,
  TCrawler extends TCrawlers<any>,
> {
  name?: string;
  description?: string;
  remoteDatastores?: { [source: string]: string };
  tables?: TTable;
  functions?: TFunction;
  crawlers?: TCrawler;
  paymentAddress?: string;
  giftCardIssuerIdentity?: string;
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
