import { ExtractSchemaType } from '@ulixee/schema';
import { SqlParser } from '@ulixee/sql-engine';
import assert = require('assert');
import IQueryOptions from '../interfaces/IQueryOptions';
import ITableComponents from '../interfaces/ITableComponents';
import DatastoreApiClient from './DatastoreApiClient';
import { IQueryInternalCallbacks } from './DatastoreInternal';
import Table, { IExpandedTableSchema } from './Table';

export interface IPassthroughTableComponents<
  TRemoteSources extends Record<string, string>,
  TTableName extends string,
  TSchema,
> extends ITableComponents<TSchema> {
  remoteTable: `${keyof TRemoteSources & string}.${TTableName}`;
}

export default class PassthroughTable<
  TRemoteSources extends Record<string, string>,
  TTableName extends string,
  TSchema extends IExpandedTableSchema<any> = IExpandedTableSchema<any>,
  TSchemaType extends ExtractSchemaType<TSchema> = ExtractSchemaType<TSchema>,
  TComponents extends IPassthroughTableComponents<
    TRemoteSources,
    TTableName,
    TSchema
  > = IPassthroughTableComponents<TRemoteSources, TTableName, TSchema>,
> extends Table<TSchema> {
  public readonly remoteSource: string;
  public readonly remoteTable: string;
  public remoteDatastoreId: string;
  public remoteVersion: string;
  public remoteDomain: string;

  protected upstreamClient: DatastoreApiClient;

  constructor(components: TComponents) {
    super(components);

    assert(components.remoteTable, 'A remote table is required');
    assert(components.remoteTable.includes('.'), 'A remote table source is required');
    const [source, remoteTable] = components.remoteTable.split('.');
    this.remoteTable = remoteTable;
    this.remoteSource = source;
  }

  public override async queryInternal<T = TSchemaType[]>(
    sql: string,
    boundValues: any[] = [],
    options?: IQueryOptions,
    callbacks?: IQueryInternalCallbacks,
  ): Promise<T> {
    callbacks.onPassthroughTable ??= (_name, opts, run) => run(opts);
    return callbacks.onPassthroughTable(this.name, options, async modifiedOptions => {
      await this.injectRemoteClient();
      // if we queried our own table, replace that now with an external table
      if (this.name !== this.remoteTable) {
        const sqlParser = new SqlParser(sql, {}, { [this.name]: this.remoteTable });
        sql = sqlParser.toSql();
      }
      const result = await this.upstreamClient.query<T>(
        this.remoteDatastoreId,
        this.remoteVersion,
        sql,
        {
          boundValues,
          ...modifiedOptions,
          paymentService: this.datastoreInternal.remotePaymentService,
          domain: this.remoteDomain,
        },
      );

      if (result.runError) throw result.runError;
      return result.outputs as any;
    });
  }

  protected async injectRemoteClient(): Promise<void> {
    if (this.upstreamClient) return;
    const { datastoreHost, client } = await this.datastoreInternal.getRemoteApiClient(
      this.remoteSource,
    );

    this.remoteDatastoreId = datastoreHost.datastoreId;
    this.remoteVersion = datastoreHost.version;
    this.remoteDomain = datastoreHost.domain;
    this.upstreamClient = client;
  }
}
