import addGlobalInstance from '@ulixee/commons/lib/addGlobalInstance';
import IDatastoreComponents, {
  TCrawlers,
  TExtractors,
  TTables,
} from '../interfaces/IDatastoreComponents';
import DatastoreInternal, { IDatastoreBinding, IQueryInternalCallbacks } from './DatastoreInternal';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';

export default class Datastore<
  TTable extends TTables = TTables,
  TExtractor extends TExtractors = TExtractors,
  TCrawler extends TCrawlers = TCrawlers,
  TComponents extends IDatastoreComponents<TTable, TExtractor, TCrawler> = IDatastoreComponents<
    TTable,
    TExtractor,
    TCrawler
  >,
> {
  #datastoreInternal: DatastoreInternal<TTable, TExtractor, TCrawler, TComponents>;

  public get affiliateId(): string {
    return this.#datastoreInternal.affiliateId;
  }

  public get metadata(): IDatastoreMetadata {
    return this.#datastoreInternal.metadata;
  }

  public get extractors(): TComponents['extractors'] {
    return this.#datastoreInternal.extractors;
  }

  public get tables(): TComponents['tables'] {
    return this.#datastoreInternal.tables;
  }

  public get crawlers(): TComponents['crawlers'] {
    return this.#datastoreInternal.crawlers;
  }

  public get authenticateIdentity(): TComponents['authenticateIdentity'] {
    return this.#datastoreInternal.components.authenticateIdentity;
  }

  constructor(
    components: TComponents,
    datastoreInternal?: DatastoreInternal<TTable, TExtractor, TCrawler, TComponents>,
  ) {
    this.#datastoreInternal = datastoreInternal ?? new DatastoreInternal(components);
  }

  public queryInternal<TResultType = any[]>(
    sql: string,
    boundValues: any[] = [],
    queryId?: string,
    callbacks: IQueryInternalCallbacks = {},
  ): Promise<TResultType> {
    return this.#datastoreInternal.queryInternal(sql, boundValues, queryId, callbacks);
  }

  public bind(config: IDatastoreBinding): DatastoreInternal {
    return this.#datastoreInternal.bind(config);
  }
}

addGlobalInstance(Datastore);
