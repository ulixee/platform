import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import { ExtractSchemaType } from '@ulixee/schema';
import { SqlParser } from '@ulixee/sql-engine';
import assert = require('assert');
import ITableComponents from '../interfaces/ITableComponents';
import DatastoreApiClient from './DatastoreApiClient';
import Table, { IExpandedTableSchema } from './Table';

export type IPassthroughQueryRunOptions = Omit<
  IDatastoreApiTypes['Datastore.query']['args'],
  'sql' | 'boundValues' | 'version' | 'id'
>;

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
    options: IPassthroughQueryRunOptions = { queryId: undefined },
  ): Promise<T> {
    this.createApiClient();
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
        ...options,
      },
    );
    return result.outputs as any;
  }

  protected createApiClient(): void {
    if (this.upstreamClient) return;
    const remoteSource = this.remoteSource;
    // need lookup
    const remoteDatastore = this.datastoreInternal.metadata.remoteDatastores[remoteSource];

    assert(remoteDatastore, `A remote datastore source could not be found for ${remoteSource}`);

    try {
      const [datastoreId, datastoreVersion] = remoteDatastore.split('/').pop().split('@v');
      this.remoteDatastoreId = datastoreId;
      this.remoteVersion = datastoreVersion;
      this.upstreamClient = this.datastoreInternal.createApiClient(remoteDatastore);
    } catch (error) {
      throw new Error(
        'A valid url was not supplied for this remote datastore. Format should be ulx://<host>/<datastoreId>@v<datastoreVersion>',
      );
    }
  }
}
