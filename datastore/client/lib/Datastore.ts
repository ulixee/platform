import IDatastoreManifest from '@ulixee/specification/types/IDatastoreManifest';
import ConnectionToDatastoreCore from '../connections/ConnectionToDatastoreCore';
import IDatastoreComponents, {
  TCrawlers,
  TFunctions,
  TTables,
} from '../interfaces/IDatastoreComponents';
import DatastoreInternal from './DatastoreInternal';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';
import DatastoreApiClient from './DatastoreApiClient';

export default class Datastore<
  TTable extends TTables = TTables,
  TFunction extends TFunctions = TFunctions,
  TCrawler extends TCrawlers = TCrawlers,
  TComponents extends IDatastoreComponents<TTable, TFunction, TCrawler> = IDatastoreComponents<
    TTable,
    TFunction,
    TCrawler
  >,
> {
  #datastoreInternal: DatastoreInternal<TTable, TFunction, TCrawler, TComponents>;

  public disableAutorun: boolean;

  public get affiliateId(): string {
    return this.#datastoreInternal.affiliateId;
  }

  public get metadata(): IDatastoreMetadata {
    return this.#datastoreInternal.metadata;
  }

  public get functions(): TComponents['functions'] {
    return this.#datastoreInternal.functions;
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
    datastoreInternal?: DatastoreInternal<TTable, TFunction, TCrawler, TComponents>,
  ) {
    this.#datastoreInternal = datastoreInternal ?? new DatastoreInternal(components);

    this.disableAutorun ??= Boolean(
      JSON.parse(process.env.ULX_DATASTORE_DISABLE_AUTORUN?.toLowerCase() ?? 'false'),
    );
  }

  public queryInternal<TResultType = any>(
    sql: string,
    boundValues: any[] = [],
  ): Promise<TResultType> {
    return this.#datastoreInternal.queryInternal(sql, boundValues);
  }

  public addConnectionToDatastoreCore(
    connectionToCore: ConnectionToDatastoreCore,
    manifest?: IDatastoreManifest,
    apiClientLoader?: (url: string) => DatastoreApiClient,
  ): void {
    this.#datastoreInternal.manifest = manifest;
    this.#datastoreInternal.connectionToCore = connectionToCore;
    if (apiClientLoader) this.#datastoreInternal.createApiClient = apiClientLoader;
  }
}
