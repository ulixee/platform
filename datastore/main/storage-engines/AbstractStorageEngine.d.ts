import { SqlParser } from '@ulixee/sql-engine';
import { IAnySchemaJson } from '@ulixee/schema/interfaces/ISchemaJson';
import { IDbJsTypes, IDbTypeNames } from '@ulixee/sql-engine/interfaces/IDbTypes';
import ISqlAdapter from '@ulixee/sql-engine/interfaces/ISqlAdapter';
import IDatastoreComponents, { TCrawlers, TExtractors, TTables } from '../interfaces/IDatastoreComponents';
import Datastore from '../lib/Datastore';
import IStorageEngine, { TQueryCallMeta } from '../interfaces/IStorageEngine';
export declare type ISchema = Record<string, IAnySchemaJson>;
export default abstract class AbstractStorageEngine implements IStorageEngine {
    readonly inputsByName: {
        [name: string]: ISchema;
    };
    readonly schemasByName: {
        [name: string]: ISchema;
    };
    readonly virtualTableNames: Set<string>;
    abstract close(): Promise<void>;
    protected readonly adapter: ISqlAdapter;
    protected abstract createTable?(name: string, schema: ISchema): Promise<void>;
    protected isBound: boolean;
    abstract query<TResult>(sql: string | SqlParser, boundValues: IDbJsTypes[], metadata?: TQueryCallMeta, virtualEntitiesByName?: {
        [name: string]: {
            parameters?: Record<string, any>;
            records: Record<string, any>[];
        };
    }): Promise<TResult>;
    bind(datastore: IDatastoreComponents<TTables, TExtractors, TCrawlers>): void;
    create(datastore: Datastore, previousVersion?: Datastore): Promise<void>;
    protected recordToEngineRow(record: Record<string, IDbJsTypes>, schema: Record<string, IAnySchemaJson>, inputSchema?: Record<string, IAnySchemaJson>, tmpSchemaFieldTypes?: {
        [fieldName: string]: IDbTypeNames;
    }): Record<string, any>;
    protected recordsFromEngine<TResult = any[]>(records: any[], schemas: Record<string, IAnySchemaJson>[], tmpSchemaFieldTypes?: {
        [fieldName: string]: IDbTypeNames;
    }): TResult;
}
