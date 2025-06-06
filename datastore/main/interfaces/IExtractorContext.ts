import { IPayment } from '@ulixee/platform-specification';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import { IDatastoreQueryResult } from '@ulixee/platform-specification/datastore/DatastoreApis';
import Crawler from '../lib/Crawler';
import Extractor from '../lib/Extractor';
import { IOutputClass } from '../lib/Output';
import ResultIterable from '../lib/ResultIterable';
import Table from '../lib/Table';
import ICrawlerOutputSchema from './ICrawlerOutputSchema';
import IDatastoreMetadata from './IDatastoreMetadata';
import IExtractorSchema, { ExtractSchemaType } from './IExtractorSchema';
import IQueryOptions from './IQueryOptions';

export default interface IExtractorContext<TSchema extends IExtractorSchema> {
  input?: ExtractSchemaType<TSchema['input']>;
  readonly outputs?: ExtractSchemaType<TSchema['output']>[];
  readonly Output?: IOutputClass<ExtractSchemaType<TSchema['output']>>;
  schema?: TSchema;
  datastoreMetadata: IDatastoreMetadata;
  datastoreAffiliateId?: string;
  callerAffiliateId?: string;

  readonly onQueryResult?: (result: IDatastoreQueryResult) => Promise<any> | void;
  readonly queryId: string;
  readonly authentication: IDatastoreApiTypes['Datastore.query']['args']['authentication'];
  readonly onCacheUpdated?: (
    sessionId: string,
    crawler: string,
    action: 'cached' | 'evicted',
  ) => Promise<void> | void;

  readonly payment: IPayment;
  crawl<T extends Crawler>(crawler: T, options?: T['runArgsType']): Promise<ICrawlerOutputSchema>;
  run<T extends Extractor>(
    extractor: T,
    options?: T['runArgsType'],
  ): ResultIterable<ExtractSchemaType<T['schema']['output']>>;
  fetch<T extends Extractor>(
    extractor: T,
    options?: T['runArgsType'],
  ): ResultIterable<ExtractSchemaType<T['schema']['output']>>;
  // TODO: add table options typing
  fetch<T extends Table>(
    table: T,
    options?: IQueryOptions,
  ): ResultIterable<ExtractSchemaType<T['schema']>>;
  query<TResult>(sql: string, boundValues: any[], options: IQueryOptions): Promise<TResult>;
}
