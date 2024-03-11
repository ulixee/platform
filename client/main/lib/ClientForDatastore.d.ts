import ResultIterable from '@ulixee/datastore/lib/ResultIterable';
import Datastore, { ConnectionToDatastoreCore } from '@ulixee/datastore';
import IStorageEngine from '@ulixee/datastore/interfaces/IStorageEngine';
import { IOutputSchema } from '../interfaces/IInputOutput';
export default class ClientForDatastore<TDatastore extends Datastore> {
    private datastore;
    private readyPromise;
    constructor(datastore: TDatastore, options?: {
        connectionToCore: ConnectionToDatastoreCore;
        storage?: IStorageEngine;
    });
    fetch<T extends keyof TDatastore['extractors']>(extractorName: T, inputFilter: TDatastore['extractors'][T]['schemaType']['input']): ResultIterable<TDatastore['extractors'][T]['schemaType']['output']>;
    fetch<T extends keyof TDatastore['tables']>(tableName: T, inputFilter: TDatastore['tables'][T]['schemaType']): ResultIterable<TDatastore['tables'][T]['schemaType']>;
    run<T extends keyof TDatastore['extractors']>(extractorName: T, inputFilter: TDatastore['extractors'][T]['schemaType']['input']): ResultIterable<TDatastore['extractors'][T]['schemaType']['output']>;
    run<T extends keyof TDatastore['tables']>(tableName: T, inputFilter: TDatastore['tables'][T]['schemaType']): ResultIterable<TDatastore['tables'][T]['schemaType']>;
    crawl<T extends keyof TDatastore['crawlers']>(name: T, inputFilter: TDatastore['crawlers'][T]['schemaType']['input']): any;
    query<TResult extends IOutputSchema = IOutputSchema>(sql: string, boundValues: any[]): Promise<TResult>;
}
