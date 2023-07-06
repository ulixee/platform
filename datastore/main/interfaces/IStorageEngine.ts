import { IDbJsTypes } from '@ulixee/sql-engine/interfaces/IDbTypes';
import SqlParser from '@ulixee/sql-engine/lib/Parser';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import IDatastoreComponents, { TCrawlers, TExtractors, TTables } from './IDatastoreComponents';
import Datastore from '../lib/Datastore';
import { ISchema } from '../storage-engines/AbstractStorageEngine';

export default interface IStorageEngine {
  inputsByName: { [name: string]: ISchema };
  schemasByName: { [name: string]: ISchema };
  virtualTableNames: Set<string>;
  bind(datastore: IDatastoreComponents<TTables, TExtractors, TCrawlers>): void;
  create(datastore: Datastore, previousVersion?: Datastore): Promise<void>;
  query<TResult>(
    sql: string | SqlParser,
    boundValues: IDbJsTypes[],
    metadata?: TQueryCallMeta,
    virtualEntitiesByName?: {
      [name: string]: { parameters?: Record<string, any>; records: Record<string, any>[] };
    },
  ): Promise<TResult>;
  close(): Promise<void>;
}

export type TQueryCallMeta = Pick<
  IDatastoreApiTypes['Datastore.queryStorageEngine']['args'],
  'authentication' | 'payment' | 'id' | 'version' | 'queryId'
>;
