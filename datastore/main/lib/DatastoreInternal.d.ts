import { IApiSpec } from '@ulixee/net/interfaces/IApiHandlers';
import ICoreResponsePayload from '@ulixee/net/interfaces/ICoreResponsePayload';
import IUnixTime from '@ulixee/net/interfaces/IUnixTime';
import { IDatastoreApis } from '@ulixee/platform-specification/datastore';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import { SqlParser } from '@ulixee/sql-engine';
import ConnectionToDatastoreCore from '../connections/ConnectionToDatastoreCore';
import IDatastoreComponents, { TCrawlers, TExtractors, TTables } from '../interfaces/IDatastoreComponents';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';
import IExtractorRunOptions from '../interfaces/IExtractorRunOptions';
import IStorageEngine, { TQueryCallMeta } from '../interfaces/IStorageEngine';
import type Crawler from './Crawler';
import DatastoreApiClient from './DatastoreApiClient';
import Extractor from './Extractor';
import { IPassthroughQueryRunOptions } from './PassthroughTable';
import Table from './Table';
export default class DatastoreInternal<TTable extends TTables = TTables, TExtractor extends TExtractors = TExtractors, TCrawler extends TCrawlers = TCrawlers, TComponents extends IDatastoreComponents<TTable, TExtractor, TCrawler> = IDatastoreComponents<TTable, TExtractor, TCrawler>> {
    #private;
    storageEngine: IStorageEngine;
    manifest: IDatastoreManifest;
    readonly metadata: IDatastoreMetadata;
    instanceId: string;
    loadingPromises: PromiseLike<void>[];
    components: TComponents;
    readonly extractors: TExtractor;
    readonly tables: TTable;
    readonly crawlers: TCrawler;
    readonly affiliateId: string;
    get remoteDatastores(): TComponents['remoteDatastores'];
    get authenticateIdentity(): TComponents['authenticateIdentity'];
    get connectionToCore(): ConnectionToDatastoreCore;
    set connectionToCore(connectionToCore: ConnectionToDatastoreCore);
    get onCreated(): TComponents['onCreated'];
    get onVersionMigrated(): TComponents['onVersionMigrated'];
    constructor(components: TComponents);
    bind(config: IDatastoreBinding): Promise<DatastoreInternal>;
    sendRequest<T extends keyof IDatastoreApis & string>(payload: {
        command: T;
        args: IApiSpec<IDatastoreApis>[T]['args'];
        commandId?: number;
        startTime?: IUnixTime;
    }, timeoutMs?: number): Promise<ICoreResponsePayload<IDatastoreApis, T>['data']>;
    queryInternal<TResultType = any[]>(sql: string, boundValues?: any[], options?: TQueryCallMeta, callbacks?: IQueryInternalCallbacks): Promise<TResultType>;
    createApiClient(host: string): DatastoreApiClient;
    close(): Promise<void>;
    attachExtractor(extractor: Extractor, nameOverride?: string, isAlreadyAttachedToDatastore?: boolean): void;
    attachCrawler(crawler: Crawler, nameOverride?: string, isAlreadyAttachedToDatastore?: boolean): void;
    attachTable(table: Table, nameOverride?: string, isAlreadyAttachedToDatastore?: boolean): void;
    private createMetadata;
}
export interface IDatastoreBinding {
    connectionToCore?: ConnectionToDatastoreCore;
    storageEngine?: IStorageEngine;
    manifest?: IDatastoreManifest;
    apiClientLoader?: (url: string) => DatastoreApiClient;
}
export interface IQueryInternalCallbacks {
    beforeAll?(args: {
        sqlParser: SqlParser;
        functionCallsById: {
            name: string;
            id: number;
        }[];
    }): Promise<void>;
    onFunction?<TOutput = any[]>(id: number, name: string, options: IExtractorRunOptions<any>, run: (options: IExtractorRunOptions<any>) => Promise<TOutput>): Promise<TOutput>;
    onPassthroughTable?<TOutput = any[]>(name: string, options: IPassthroughQueryRunOptions, run: (options: IPassthroughQueryRunOptions) => Promise<TOutput>): Promise<TOutput>;
}
