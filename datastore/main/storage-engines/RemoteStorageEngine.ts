import IDatastoreApiTypes, {
  IDatastoreQueryMetadata,
} from '@ulixee/platform-specification/datastore/DatastoreApis';
import { SqlParser } from '@ulixee/sql-engine';
import { IDbJsTypes } from '@ulixee/sql-engine/interfaces/IDbTypes';
import ConnectionToDatastoreCore from '../connections/ConnectionToDatastoreCore';
import IQueryOptions from '../interfaces/IQueryOptions';
import { IQueryInternalCallbacks } from '../lib/DatastoreInternal';
import AbstractStorageEngine from './AbstractStorageEngine';

const queryMetadataKeys: (keyof IQueryOptions)[] = [
  'id',
  'version',
  'authentication',
  'payment',
  'affiliateId',
  'queryId',
  'domain',
];

export default class RemoteStorageEngine extends AbstractStorageEngine {
  constructor(
    protected connectionToCore: ConnectionToDatastoreCore,
    protected metadata: IDatastoreQueryMetadata,
  ) {
    super();
  }

  public override filterLocalTableCalls(_entityCalls: string[]): string[] {
    return [];
  }

  public override close(): Promise<void> {
    this.connectionToCore = null;
    return Promise.resolve();
  }

  public override async query<TResult>(
    sql: string | SqlParser,
    boundValues: IDbJsTypes[],
    metadata?: IQueryOptions,
    virtualEntitiesByName?: {
      [name: string]: { parameters?: Record<string, any>; records: Record<string, any>[] };
    },
    callbacks?: IQueryInternalCallbacks,
  ): Promise<TResult> {
    if (sql instanceof SqlParser) {
      sql = sql.toSql();
    }
    metadata ??= {} as any;

    let options = {} as IQueryOptions;
    for (const key of queryMetadataKeys) {
      const entry = metadata[key] ?? this.metadata[key];
      if (entry) options[key] = entry;
    }

    if (callbacks?.beforeStorageEngine) options = callbacks.beforeStorageEngine(options);
    const result = await this.connectionToCore.sendRequest({
      command: 'Datastore.queryStorageEngine',
      args: [
        {
          ...options,
          sql,
          boundValues,
          virtualEntitiesByName,
        },
      ],
    });
    if (metadata?.onQueryResult) {
      await metadata.onQueryResult(result);
    }

    if (result.runError) throw result.runError;

    return result.outputs as any;
  }

  public async createRemote(
    version: IDatastoreApiTypes['Datastore.upload']['args'],
    previousVersion?: IDatastoreApiTypes['Datastore.upload']['args'],
  ): Promise<void> {
    await this.connectionToCore.sendRequest({
      command: 'Datastore.createStorageEngine',
      args: [
        {
          version,
          previousVersion,
        },
      ],
    });
  }

  protected override createTable(): Promise<void> {
    throw new Error('Invalid call on a remote Storage Engine');
  }
}
