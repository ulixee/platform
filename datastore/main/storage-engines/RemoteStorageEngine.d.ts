import IDatastoreApiTypes from '@ulixee/platform-specification/datastore/DatastoreApis';
import { SqlParser } from '@ulixee/sql-engine';
import { IDbJsTypes } from '@ulixee/sql-engine/interfaces/IDbTypes';
import ConnectionToDatastoreCore from '../connections/ConnectionToDatastoreCore';
import { TQueryCallMeta } from '../interfaces/IStorageEngine';
import AbstractStorageEngine from './AbstractStorageEngine';
export default class RemoteStorageEngine extends AbstractStorageEngine {
    protected connectionToCore: ConnectionToDatastoreCore;
    protected metadata: TQueryCallMeta;
    constructor(connectionToCore: ConnectionToDatastoreCore, metadata: TQueryCallMeta);
    close(): Promise<void>;
    query<TResult>(sql: string | SqlParser, boundValues: IDbJsTypes[], metadata?: TQueryCallMeta, virtualEntitiesByName?: {
        [name: string]: {
            parameters?: Record<string, any>;
            records: Record<string, any>[];
        };
    }): Promise<TResult>;
    createRemote(version: IDatastoreApiTypes['Datastore.upload']['args'], previousVersion?: IDatastoreApiTypes['Datastore.upload']['args']): Promise<void>;
    protected createTable(): Promise<void>;
}
