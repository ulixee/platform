import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import { ExtractSchemaType } from '@ulixee/schema';
import ITableComponents from '../interfaces/ITableComponents';
import DatastoreApiClient from './DatastoreApiClient';
import Table, { IExpandedTableSchema } from './Table';
export declare type IPassthroughQueryRunOptions = Omit<IDatastoreApiTypes['Datastore.query']['args'], 'sql' | 'boundValues' | 'version' | 'id'>;
export interface IPassthroughTableComponents<TRemoteSources extends Record<string, string>, TTableName extends string, TSchema> extends ITableComponents<TSchema> {
    remoteTable: `${keyof TRemoteSources & string}.${TTableName}`;
}
export default class PassthroughTable<TRemoteSources extends Record<string, string>, TTableName extends string, TSchema extends IExpandedTableSchema<any> = IExpandedTableSchema<any>, TSchemaType extends ExtractSchemaType<TSchema> = ExtractSchemaType<TSchema>, TComponents extends IPassthroughTableComponents<TRemoteSources, TTableName, TSchema> = IPassthroughTableComponents<TRemoteSources, TTableName, TSchema>> extends Table<TSchema> {
    readonly remoteSource: string;
    readonly remoteTable: string;
    remoteDatastoreId: string;
    remoteVersion: string;
    protected upstreamClient: DatastoreApiClient;
    constructor(components: TComponents);
    queryInternal<T = TSchemaType[]>(sql: string, boundValues?: any[], options?: IPassthroughQueryRunOptions): Promise<T>;
    protected createApiClient(): void;
}
