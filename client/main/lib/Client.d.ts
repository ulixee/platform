import Datastore, { ConnectionToDatastoreCore, Crawler, Extractor, Table } from '@ulixee/datastore';
import ICrawlerOutputSchema from '@ulixee/datastore/interfaces/ICrawlerOutputSchema';
import ClientForDatastore from './ClientForDatastore';
import ClientForExtractor from './ClientForExtractor';
import ClientForTable from './ClientForTable';
import ClientForCrawler from './ClientForCrawler';
import { IInputFilter, IOutputSchema } from '../interfaces/IInputOutput';
import ILocationStringOrObject from '../interfaces/ILocationStringOrObject';
export default class ClientForRemote {
    #private;
    user: string;
    password: string;
    host: string;
    port: number;
    database: string;
    private datastoreId;
    private version;
    private get apiClient();
    constructor(uriOrObject?: ILocationStringOrObject);
    run<TInputFilter extends IInputFilter = IInputFilter, TOutputSchema extends IOutputSchema = IOutputSchema>(extractorOrTableName: string, inputFilter?: TInputFilter): Promise<TOutputSchema[]>;
    fetch<TInputFilter extends IInputFilter = IInputFilter, TOutputSchema extends IOutputSchema = IOutputSchema>(extractorOrTableName: string, inputFilter?: TInputFilter): Promise<TOutputSchema[]>;
    crawl<TInputFilter extends IInputFilter = IInputFilter>(name: string, inputFilter?: TInputFilter): Promise<ICrawlerOutputSchema>;
    query<TSchema extends IOutputSchema = IOutputSchema>(sql: string, boundValues?: any[]): Promise<TSchema[]>;
    disconnect(): Promise<void>;
    static forDatastore<T extends Datastore>(datastore: T, options?: IClientOptions): ClientForDatastore<T>;
    static forTable<T extends Table>(table: T, options?: IClientOptions): ClientForTable<T>;
    static forExtractor<T extends Extractor>(extractor: T, options?: IClientOptions): ClientForExtractor<T>;
    static forCrawler<T extends Crawler>(datastore: T, options?: IClientOptions): ClientForCrawler<T>;
}
interface IClientOptions {
    connectionToCore: ConnectionToDatastoreCore;
}
export {};
