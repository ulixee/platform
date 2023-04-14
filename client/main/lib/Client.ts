import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import Datastore, { ConnectionToDatastoreCore, Crawler, Extractor, Table } from '@ulixee/datastore';
import ICrawlerOutputSchema from '@ulixee/datastore/interfaces/ICrawlerOutputSchema';
import ClientForDatastore from './ClientForDatastore';
import ClientForExtractor from './ClientForExtractor';
import ClientForTable from './ClientForTable';
import ClientForCrawler from './ClientForCrawler';
import ConnectionParameters from './ConnectionParameters';
import { IInputFilter, IOutputSchema } from '../interfaces/IInputOutput';
import ILocationStringOrObject from '../interfaces/ILocationStringOrObject';

export default class ClientForRemote {
  public user: string;
  public password: string;
  public host: string;
  public port: number;
  public database: string;

  private get apiClient(): DatastoreApiClient {
    if (!this.#apiClient) {
      const address = `${this.host}:${this.port}`;
      this.#apiClient = new DatastoreApiClient(address);
    }
    return this.#apiClient;
  }

  #apiClient: DatastoreApiClient;

  constructor(uriOrObject: ILocationStringOrObject = {}) {
    const connectionParameters = new ConnectionParameters(uriOrObject);
    this.user = connectionParameters.user;
    this.database = connectionParameters.database;
    this.port = connectionParameters.port;
    this.host = connectionParameters.host;
    this.password = connectionParameters.password;
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
    const options = {
      payment: this.user
        ? {
            credits: {
              id: this.user,
              secret: this.password,
            },
          }
        : undefined,
    };

    return (await this.apiClient.stream(
      this.database,
      extractorOrTableName,
      inputFilter,
      options,
    )) as TOutputSchema[];
  }

  public async crawl<TInputFilter extends IInputFilter = IInputFilter>(
    name: string,
    inputFilter?: TInputFilter,
  ): Promise<ICrawlerOutputSchema> {
    if (!this.database) {
      throw new Error('You Client connection must specific a datastore to crawl');
    }
    const options = {
      payment: this.user
        ? {
            credits: {
              id: this.user,
              secret: this.password,
            },
          }
        : undefined,
    };

    const [crawlerOutput] = await this.apiClient.stream(this.database, name, inputFilter, options);
    return crawlerOutput as ICrawlerOutputSchema;
  }

  public async query<TSchema extends IOutputSchema = IOutputSchema>(
    sql: string,
    boundValues: any[] = [],
  ): Promise<TSchema[]> {
    if (!this.database) {
      throw new Error('You Client connection must specific a datastore to query');
    }
    const options = {
      boundValues,
      payment: this.user
        ? {
            credits: {
              id: this.user,
              secret: this.password,
            },
          }
        : undefined,
    };

    const { outputs } = await this.apiClient.query(this.database, sql, options);
    return outputs;
  }

  public disconnect(): Promise<void> {
    return this.#apiClient?.disconnect();
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
