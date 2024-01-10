import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import IExtractorSchema, { ExtractSchemaType } from './IExtractorSchema';
import { IOutputClass } from '../lib/Output';
import IDatastoreMetadata from './IDatastoreMetadata';
import Crawler from '../lib/Crawler';
import Extractor from '../lib/Extractor';
import Table from '../lib/Table';
import ResultIterable from '../lib/ResultIterable';
import ICrawlerOutputSchema from './ICrawlerOutputSchema';
import { TQueryCallMeta } from './IStorageEngine';
export default interface IExtractorContext<TSchema extends IExtractorSchema> {
    input?: ExtractSchemaType<TSchema['input']>;
    readonly outputs?: ExtractSchemaType<TSchema['output']>[];
    readonly Output?: IOutputClass<ExtractSchemaType<TSchema['output']>>;
    schema?: TSchema;
    datastoreMetadata: IDatastoreMetadata;
    datastoreAffiliateId?: string;
    callerAffiliateId?: string;
    readonly authentication: IDatastoreApiTypes['Datastore.query']['args']['authentication'];
    readonly payment: IDatastoreApiTypes['Datastore.query']['args']['payment'];
    crawl<T extends Crawler>(crawler: T, options?: T['runArgsType']): Promise<ICrawlerOutputSchema>;
    run<T extends Extractor>(extractor: T, options?: T['runArgsType']): ResultIterable<ExtractSchemaType<T['schema']['output']>>;
    fetch<T extends Extractor>(extractor: T, options?: T['runArgsType']): ResultIterable<ExtractSchemaType<T['schema']['output']>>;
    fetch<T extends Table>(table: T, options?: TQueryCallMeta): ResultIterable<ExtractSchemaType<T['schema']>>;
    query<TResult>(sql: string, boundValues: any[], options: TQueryCallMeta): Promise<TResult>;
}
