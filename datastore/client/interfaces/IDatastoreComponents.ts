import Crawler from '../lib/Crawler';
import Function from '../lib/Function';
import Table from '../lib/Table';
import CreditsTable from '../lib/CreditsTable';

export default interface IDatastoreComponents<
  TTable extends TTables,
  TFunction extends TFunctions,
  TCrawler extends TCrawlers,
> {
  name?: string;
  description?: string;
  domain?: string;
  remoteDatastores?: {
    [source: string]: string;
  };
  remoteDatastoreEmbeddedCredits?: {
    [source: string]: { id: string; secret: string };
  };
  tables?: TTable & { credits?: CreditsTable };
  functions?: TFunction;
  crawlers?: TCrawler;
  paymentAddress?: string;
  affiliateId?: string;
  adminIdentities?: string[];
  authenticateIdentity?(identity: string, nonce: string): Promise<boolean> | boolean;
}

export type TFunctions<T = any, TFunc extends Function = Function> = T extends Record<string, TFunc>
  ? {
      [K in keyof T]: T[K];
    }
  : never;

export type TTables<T = any, TTable extends Table = Table> = T extends Record<string, TTable>
  ? {
      [K in keyof T]: T[K];
    }
  : never;

export type TCrawlers<T = any, TCrawler extends Crawler = Crawler> = T extends Record<
  string,
  TCrawler
>
  ? {
      [K in keyof T]: T[K];
    }
  : never;
