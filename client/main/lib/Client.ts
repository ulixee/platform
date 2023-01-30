import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import ClientForDatastore from "./ClientForDatastore";
import ClientForRunner from './ClientForRunner';
import ClientForTable from './ClientForTable';
import ClientForCrawler from './ClientForCrawler';
import ConnectionParameters from './ConnectionParameters';
import { IInputFilter, IOutputSchema } from '../interfaces/IInputOutput';
import ILocationStringOrObject from '../interfaces/ILocationStringOrObject';

export default class ClientForRemote {
  public static ForDatastore = ClientForDatastore;
  public static ForTable = ClientForTable;
  public static ForRunner = ClientForRunner;
  public static ForCrawler = ClientForCrawler;

  public user: string;
  public password: string;
  public host: string;
  public port: number;
  public database: string;

  #apiClient: DatastoreApiClient;

  constructor(uriOrObject: ILocationStringOrObject = {}) {
    const connectionParameters = new ConnectionParameters(uriOrObject)
    this.user = connectionParameters.user
    this.database = connectionParameters.database
    this.port = connectionParameters.port
    this.host = connectionParameters.host
    this.password = connectionParameters.password  
  }

  private get apiClient(): DatastoreApiClient {
    if (!this.#apiClient) {
      const address = `${this.host}:${this.port}`;
      this.#apiClient = new DatastoreApiClient(address);
    }
    return this.#apiClient;
  }

  public async run<
    TInputFilter extends IInputFilter = IInputFilter,
    TOutputSchema extends IOutputSchema = IOutputSchema,
  >(runnerOrTableName: string, inputFilter?: TInputFilter): Promise<TOutputSchema[]> {
    return await this.fetch(runnerOrTableName, inputFilter);
  }

  public async fetch<
    TInputFilter extends IInputFilter = IInputFilter,
    TOutputSchema extends IOutputSchema = IOutputSchema,
  >(runnerOrTableName: string, inputFilter?: TInputFilter): Promise<TOutputSchema[]> {
    if (!this.database) {
      throw new Error('You Client connection must specific a datastore to fetch');
    }
    const options = {
      payment: this.user ? {
        credits: {
          id: this.user,
          secret: this.password,
        }
      } : undefined,
    };

    return await this.apiClient.stream(this.database, runnerOrTableName, inputFilter, options) as TOutputSchema[];
  }

  public async crawl<
    TInputFilter extends IInputFilter = IInputFilter
  >(name: string, inputFilter?: TInputFilter): Promise<IOutputSchema[]> {
    if (!this.database) {
      throw new Error('You Client connection must specific a datastore to crawl');
    }
    const options = {
      payment: this.user ? {
        credits: {
          id: this.user,
          secret: this.password,
        }
      } : undefined,
    };

    return await this.apiClient.stream(this.database, name, inputFilter, options);
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
      payment: this.user ? {
        credits: {
          id: this.user,
          secret: this.password,
        }
      } : undefined,
    };
    
    const { outputs } = await this.apiClient.query(this.database, sql, options);
    return outputs;
  }
}
