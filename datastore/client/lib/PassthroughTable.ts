import { ExtractSchemaType } from '@ulixee/schema';
import * as assert from 'assert';
import { SqlParser } from '@ulixee/sql-engine';
import { IDatastoreApiTypes } from '@ulixee/specification/datastore';
import ITableSchema from '../interfaces/ITableSchema';
import Table, { IExpandedTableSchema } from './Table';
import ITableComponents from '../interfaces/ITableComponents';
import DatastoreApiClient from './DatastoreApiClient';

export interface IPassthroughTableComponents<
  TRemoteSources extends Record<string, string>,
  TTableName extends string,
  TSchema,
  TSeedlings,
> extends ITableComponents<TSchema, TSeedlings> {
  remoteTable: `${keyof TRemoteSources & string}.${TTableName}`;
}

export default class PassthroughTable<
  TRemoteSources extends Record<string, string>,
  TTableName extends string,
  TSchema extends IExpandedTableSchema<any> = IExpandedTableSchema<any>,
  TRecords extends ExtractSchemaType<TSchema> = ExtractSchemaType<TSchema>,
  TComponents extends IPassthroughTableComponents<
    TRemoteSources,
    TTableName,
    TSchema,
    TRecords
  > = IPassthroughTableComponents<TRemoteSources, TTableName, TSchema, TRecords>,
> extends Table<TSchema, TRecords, TComponents> {
  public readonly remoteSource: string;
  public readonly remoteTable: string;
  public datastoreVersionHash: string;

  protected upstreamClient: DatastoreApiClient;

  constructor(components: TComponents) {
    super(components);

    assert(components.remoteTable, 'A remote table is required');
    assert(components.remoteTable.includes('.'), 'A remote table source is required');
    const [source, remoteTable] = components.remoteTable.split('.');
    this.remoteTable = remoteTable;
    this.remoteSource = source;
  }

  public override async query<T = TRecords>(
    sql: string,
    boundValues: any[] = [],
    options: Omit<
      IDatastoreApiTypes['Datastore.query']['args'],
      'sql' | 'boundValues' | 'versionHash'
    > = {},
  ): Promise<T[]> {
    this.createApiClient();
    if (this.name !== this.remoteTable) {
      const sqlParser = new SqlParser(sql, {}, { [this.name]: this.remoteTable });
      sql = sqlParser.toSql();
    }
    const result = await this.upstreamClient.query<T>(this.datastoreVersionHash, sql, {
      boundValues,
      ...options,
    });
    return result.outputs;
  }

  protected createApiClient(): void {
    if (this.upstreamClient) return;
    const remoteSource = this.remoteSource;
    // need lookup
    const remoteDatastore = this.datastoreInternal.metadata.remoteDatastores[remoteSource];

    assert(remoteDatastore, `A remote datastore source could not be found for ${remoteSource}`);

    try {
      const url = new URL(remoteDatastore);
      this.datastoreVersionHash = url.pathname.slice(1);
      this.upstreamClient = new DatastoreApiClient(url.host);
    } catch (error) {
      throw new Error(
        'A valid url was not supplied for this remote datastore. Format should be ulx://<host>/<datastoreVersionHash>',
      );
    }
  }

  // Do not create in-memory table for a remote table
  protected override createInMemoryTable(): Promise<void> {
    return Promise.resolve();
  }
}
