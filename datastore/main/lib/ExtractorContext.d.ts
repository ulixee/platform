import { IPayment } from '@ulixee/platform-specification';
import { IDatastoreQueryMetadata, IDatastoreQueryResult } from '@ulixee/platform-specification/datastore/DatastoreApis';
import { ExtractSchemaType } from '@ulixee/schema';
import ICrawlerOutputSchema from '../interfaces/ICrawlerOutputSchema';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';
import IExtractorContext from '../interfaces/IExtractorContext';
import IExtractorSchema from '../interfaces/IExtractorSchema';
import IQueryOptions from '../interfaces/IQueryOptions';
import Crawler from './Crawler';
import DatastoreInternal, { IQueryInternalCallbacks } from './DatastoreInternal';
import Extractor from './Extractor';
import ExtractorInternal from './ExtractorInternal';
import ResultIterable from './ResultIterable';
import Table from './Table';
export default class ExtractorContext<ISchema extends IExtractorSchema, TExtractorInternal extends ExtractorInternal<ISchema> = ExtractorInternal<ISchema>> implements IExtractorContext<ISchema> {
    #private;
    datastoreMetadata: IDatastoreMetadata;
    datastoreAffiliateId: string;
    callerAffiliateId: string;
    extraOptions: Record<string, any>;
    get authentication(): IDatastoreQueryMetadata['authentication'];
    get queryId(): string;
    get payment(): IPayment;
    get input(): TExtractorInternal['input'];
    get outputs(): TExtractorInternal['outputs'];
    get Output(): TExtractorInternal['Output'];
    get schema(): ISchema;
    get onQueryResult(): (result: IDatastoreQueryResult) => Promise<any> | void;
    constructor(extractorInternal: ExtractorInternal<ISchema>, datastoreInternal: DatastoreInternal, callbacks?: IQueryInternalCallbacks);
    fetch<T extends Extractor>(extractor: T, options: T['runArgsType']): ResultIterable<ExtractSchemaType<T['schema']['output']>>;
    fetch<T extends Table>(table: T, options: any): ResultIterable<ExtractSchemaType<T['schema']>>;
    run<T extends Extractor>(extractor: T, options: T['runArgsType']): ResultIterable<ExtractSchemaType<T['schema']['output']>>;
    run<T extends Table>(table: T, options: any): ResultIterable<ExtractSchemaType<T['schema']>>;
    crawl<T extends Crawler>(crawler: T, options?: T['runArgsType']): Promise<ICrawlerOutputSchema>;
    query<TResult>(sql: string, boundValues: any[], options: IQueryOptions): Promise<TResult>;
    private getMergedOptions;
}