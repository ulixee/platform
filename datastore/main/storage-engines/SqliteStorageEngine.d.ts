import { SqlParser } from '@ulixee/sql-engine';
import { IAnySchemaJson } from '@ulixee/schema/interfaces/ISchemaJson';
import { IDbJsTypes } from '@ulixee/sql-engine/interfaces/IDbTypes';
import SqliteAdapter from '@ulixee/sql-engine/adapters/SqliteAdapter';
import { TQueryCallMeta } from '../interfaces/IStorageEngine';
import AbstractStorageEngine from './AbstractStorageEngine';
declare type ISchema = Record<string, IAnySchemaJson>;
export default class SqliteStorageEngine extends AbstractStorageEngine {
    #private;
    readonly path: string;
    readonly adapter: SqliteAdapter;
    constructor(storagePath?: string);
    close(): Promise<void>;
    query<TResult>(sql: string | SqlParser, boundValues: IDbJsTypes[], metadata?: TQueryCallMeta, virtualEntitiesByName?: {
        [name: string]: {
            parameters?: Record<string, any>;
            records: Record<string, any>[];
        };
    }): Promise<TResult>;
    protected createTable(name: string, schema: ISchema): Promise<void>;
    private convertBoundValuesToMap;
}
export {};
