import IDatastoreComponents, { TCrawlers, TExtractors, TTables } from '../interfaces/IDatastoreComponents';
import DatastoreInternal, { IDatastoreBinding, IQueryInternalCallbacks } from './DatastoreInternal';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';
import { TQueryCallMeta } from '../interfaces/IStorageEngine';
export default class Datastore<TTable extends TTables = TTables, TExtractor extends TExtractors = TExtractors, TCrawler extends TCrawlers = TCrawlers, TComponents extends IDatastoreComponents<TTable, TExtractor, TCrawler> = IDatastoreComponents<TTable, TExtractor, TCrawler>> {
    #private;
    get affiliateId(): string;
    get metadata(): IDatastoreMetadata;
    get extractors(): TComponents['extractors'];
    get tables(): TComponents['tables'];
    get crawlers(): TComponents['crawlers'];
    get authenticateIdentity(): TComponents['authenticateIdentity'];
    get onCreated(): TComponents['onCreated'];
    get onVersionMigrated(): TComponents['onVersionMigrated'];
    constructor(components: TComponents, datastoreInternal?: DatastoreInternal<TTable, TExtractor, TCrawler, TComponents>);
    queryInternal<TResultType = any[]>(sql: string, boundValues?: any[], options?: TQueryCallMeta, callbacks?: IQueryInternalCallbacks): Promise<TResultType>;
    bind(config: IDatastoreBinding): Promise<DatastoreInternal>;
}
