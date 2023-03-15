import IDatastoreComponents, {
  TCrawlers,
  TRunners,
  TTables,
} from '../interfaces/IDatastoreComponents';
import DatastoreInternal, { IDatastoreBinding, IQueryInternalCallbacks } from './DatastoreInternal';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';

export default class Datastore<
  TTable extends TTables = TTables,
  TRunner extends TRunners = TRunners,
  TCrawler extends TCrawlers = TCrawlers,
  TComponents extends IDatastoreComponents<TTable, TRunner, TCrawler> = IDatastoreComponents<
    TTable,
    TRunner,
    TCrawler
  >,
> {
  #datastoreInternal: DatastoreInternal<TTable, TRunner, TCrawler, TComponents>;

  public get affiliateId(): string {
    return this.#datastoreInternal.affiliateId;
  }

  public get metadata(): IDatastoreMetadata {
    return this.#datastoreInternal.metadata;
  }

  public get runners(): TComponents['runners'] {
    return this.#datastoreInternal.runners;
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
    datastoreInternal?: DatastoreInternal<TTable, TRunner, TCrawler, TComponents>,
  ) {
    this.#datastoreInternal = datastoreInternal ?? new DatastoreInternal(components);
  }

  public queryInternal<TResultType = any[]>(
    sql: string,
    boundValues: any[] = [],
    callbacks: IQueryInternalCallbacks = {},
  ): Promise<TResultType> {
    return this.#datastoreInternal.queryInternal(sql, boundValues, callbacks);
  }

  public bind(config: IDatastoreBinding): DatastoreInternal {
    return this.#datastoreInternal.bind(config);
  }
}
