import { EventEmitter } from 'events';
import Log from '@ulixee/commons/lib/Logger';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import ConnectionParameters from './lib/ConnectionParameters';

// ulx://paymentHash@ip:port/versionHash

const { log } = Log(module);

interface IConfig {
  connectionString?: string;
  user?: string;
  password?: string;
  host?: string;
  port?: string | number;
  database?: string;
}

export default class Client extends EventEmitter  {
  private connectionParameters;
  private user: string;
  private password: string;
  private host: string;
  private port: string;
  private database: string;

  #apiClient: DatastoreApiClient;

  constructor(config: string | IConfig = {}) {
    super();

    this.connectionParameters = new ConnectionParameters(config)
    this.user = this.connectionParameters.user
    this.database = this.connectionParameters.database
    this.port = this.connectionParameters.port
    this.host = this.connectionParameters.host
    this.password = this.connectionParameters.password
  }

  public get apiClient(): DatastoreApiClient {
    if (!this.#apiClient) {
      const address = `${this.host}:${this.port}`;
      this.#apiClient = new DatastoreApiClient(address);
      // const onError = this.onConnectionError.bind(this);
    }
    return this.#apiClient;
  }

  public async run(functionOrTableName: string, filter?: Record<string, any>): Promise<any[]> {
    return await this.fetch(functionOrTableName, filter);
  }

  public async fetch(functionOrTableName: string, filter?: Record<string, any>): Promise<any[]> {
    const options = {
      payment: this.user ? {
        credits: {
          id: this.user,
          secret: this.password,
        }
      } : undefined,
    };

    return await this.apiClient.stream(this.database, functionOrTableName, filter, options);
  }

  public async query<TResultType = any>(
    sql: string,
    boundValues: any[] = [],
  ): Promise<TResultType> {
    const options = {
      boundValues,
      payment: this.user ? {
        credits: {
          id: this.user,
          secret: this.password,
        }
      } : undefined,
    };
    const response = await this.apiClient.query(this.database, sql, options);

    return response.outputs as any;
  }  

  private onConnectionError(error: Error): void {
    if (error) {
      log.error('Error connecting to core', {
        error,
        sessionId: null,
      });
      this.emit('error', error);
    }
  };
}