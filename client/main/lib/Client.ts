import Datastore, { ConnectionToDatastoreCore, Crawler, Extractor, Table } from '@ulixee/datastore';
import ICrawlerOutputSchema from '@ulixee/datastore/interfaces/ICrawlerOutputSchema';
import IPaymentService from '@ulixee/datastore/interfaces/IPaymentService';
import IQueryOptions from '@ulixee/datastore/interfaces/IQueryOptions';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { DataDomainStore } from '@ulixee/localchain';
import { isIP } from 'node:net';
import { IInputFilter, IOutputSchema } from '../interfaces/IInputOutput';
import ILocationStringOrObject from '../interfaces/ILocationStringOrObject';
import ClientForCrawler from './ClientForCrawler';
import ClientForDatastore from './ClientForDatastore';
import ClientForExtractor from './ClientForExtractor';
import ClientForTable from './ClientForTable';
import ConnectionParameters from './ConnectionParameters';

export interface IClientConfig
  extends Partial<
    Pick<IQueryOptions, 'authentication' | 'affiliateId' | 'onQueryResult' | 'queryId'>
  > {
  paymentService?: IPaymentService;
  mainchainUrl?: string;
}

export default class ClientForRemote {
  public user: string;
  public password: string;
  public host: string;
  public port: number;
  public database: string;
  /**
   * This variable is here just to detect when we do not think this host is a data domain
   */
  public readonly isDnsHost: boolean;

  private datastoreId: string;
  private version: string;
  private domain?: string;
  private creditAttachPromise: Promise<void>;
  private domainLookupPromise: Promise<void>;

  #apiClient: DatastoreApiClient;

  constructor(
    uriOrObject: ILocationStringOrObject = {},
    readonly config?: IClientConfig,
  ) {
    const connectionParameters = new ConnectionParameters(uriOrObject);
    this.user = connectionParameters.user;
    this.port = connectionParameters.port;
    this.host = connectionParameters.host;
    this.password = connectionParameters.password;

    if (connectionParameters.database) {
      this.database = connectionParameters.database;
      const [datastoreId, version] = this.database.split('@');
      this.datastoreId = datastoreId;
      if (version) this.version = version.replace('v', '');
    }

    const isDnsOrDomain = !isIP(this.host) && this.host !== 'localhost';
    if (isDnsOrDomain && typeof uriOrObject === 'string') {
      try {
        // see if this is a domain
        DataDomainStore.parse(this.host);

        if (!config?.mainchainUrl)
          throw new Error('No mainchain url provided to lookup this datastore host');
        this.domainLookupPromise = this.lookupDomain(uriOrObject);
      } catch (err) {
        this.isDnsHost = true;
        // not a domain name
      }
    }
  }

  public async run<
    TInputFilter extends IInputFilter = IInputFilter,
    TOutputSchema extends IOutputSchema = IOutputSchema,
  >(extractorOrTableName: string, inputFilter?: TInputFilter): Promise<TOutputSchema[]> {
    return await this.fetch(extractorOrTableName, inputFilter);
  }

  public async fetch<
    TInputFilter extends IInputFilter = IInputFilter,
    TOutputSchema extends IOutputSchema = IOutputSchema,
  >(extractorOrTableName: string, inputFilter?: TInputFilter): Promise<TOutputSchema[]> {
    if (!this.database) {
      throw new Error('You Client connection must specific a datastore to fetch');
    }
    await this.attachCredit();

    const apiClient = await this.getApiClient();

    return (await apiClient.stream(
      this.datastoreId,
      this.version,
      extractorOrTableName,
      inputFilter,
      { domain: this.domain, ...this.config },
    )) as TOutputSchema[];
  }

  public async crawl<TInputFilter extends IInputFilter = IInputFilter>(
    name: string,
    inputFilter?: TInputFilter,
  ): Promise<ICrawlerOutputSchema> {
    if (!this.database) {
      throw new Error('You Client connection must specific a datastore to crawl');
    }
    await this.attachCredit();
    const apiClient = await this.getApiClient();
    const [crawlerOutput] = await apiClient.stream(
      this.datastoreId,
      this.version,
      name,
      inputFilter,
      {
        domain: this.domain,
        ...this.config,
      },
    );
    return crawlerOutput as ICrawlerOutputSchema;
  }

  public async query<TSchema extends IOutputSchema = IOutputSchema>(
    sql: string,
    boundValues: any[] = [],
  ): Promise<TSchema[]> {
    if (!this.database) {
      throw new Error('You Client connection must specific a datastore to query');
    }

    const apiClient = await this.getApiClient();
    const { outputs } = await apiClient.query(this.datastoreId, this.version, sql, {
      boundValues,
      domain: this.domain,
      ...this.config,
    });
    return outputs;
  }

  public disconnect(): Promise<void> {
    return this.#apiClient?.disconnect();
  }

  private async getApiClient(): Promise<DatastoreApiClient> {
    if (this.#apiClient === undefined) {
      this.#apiClient = null;
      await this.domainLookupPromise;
      const address = `${this.host}:${this.port}`;
      this.#apiClient = new DatastoreApiClient(address);
    }
    return this.#apiClient;
  }

  private async lookupDomain(domainName: string): Promise<void> {
    const lookup = await DatastoreApiClient.lookupDatastoreHost(
      domainName,
      this.config.mainchainUrl,
    );

    this.datastoreId = lookup.datastoreId;
    this.domain = lookup.domain;
    this.version = lookup.version;
    const parsed = new ConnectionParameters(lookup.host);
    this.host = parsed.host;
    this.port = parsed.port;
  }

  private attachCredit(): Promise<void> {
    if (this.creditAttachPromise) return this.creditAttachPromise;

    if (this.user && this.config?.paymentService) {
      this.creditAttachPromise = this.config.paymentService.attachCredit(
        `ulx://${this.host}:${this.port}/${this.datastoreId}@v${this.version}`,
        {
          secret: this.password,
          id: this.user,
        },
      );
    } else {
      this.creditAttachPromise = Promise.resolve();
    }
    return this.creditAttachPromise;
  }

  public static forDatastore<T extends Datastore>(
    datastore: T,
    options?: IClientOptions,
  ): ClientForDatastore<T> {
    return new ClientForDatastore(datastore, options);
  }

  public static forTable<T extends Table>(table: T, options?: IClientOptions): ClientForTable<T> {
    return new ClientForTable(table, options);
  }

  public static forExtractor<T extends Extractor>(
    extractor: T,
    options?: IClientOptions,
  ): ClientForExtractor<T> {
    return new ClientForExtractor(extractor, options);
  }

  public static forCrawler<T extends Crawler>(
    datastore: T,
    options?: IClientOptions,
  ): ClientForCrawler<T> {
    return new ClientForCrawler(datastore, options);
  }
}

interface IClientOptions {
  connectionToCore: ConnectionToDatastoreCore;
}
