import { SqlParser } from '@ulixee/sql-engine';
import { IDbJsTypes } from '@ulixee/sql-engine/interfaces/IDbTypes';
import AbstractStorageEngine from './AbstractStorageEngine';
import ConnectionToDatastoreCore from '../connections/ConnectionToDatastoreCore';
import { TQueryCallMeta } from '../interfaces/IStorageEngine';

export default class RemoteStorageEngine extends AbstractStorageEngine {
  protected connectionToCore: ConnectionToDatastoreCore;
  constructor(readonly storageEngineHost: string) {
    super();
    this.connectionToCore = ConnectionToDatastoreCore.remote(storageEngineHost);
  }

  public override async close(): Promise<void> {
    await this.connectionToCore.disconnect();
  }

  public override query<TResult>(
    sql: string | SqlParser,
    boundValues: IDbJsTypes[],
    virtualEntitiesByName?: {
      [name: string]: { parameters?: Record<string, any>; records: Record<string, any>[] };
    },
    metadata?: TQueryCallMeta,
  ): Promise<TResult> {
    if (sql instanceof SqlParser) sql = sql.toSql();
    return this.connectionToCore.sendRequest({
      command: 'Datastore.queryStorageEngine',
      args: [
        {
          sql,
          boundValues,
          virtualEntitiesByName,
          ...metadata,
        },
      ],
    }) as any;
  }

  protected override createTable(): Promise<void> {
    throw new Error('Invalid call on a remote Storage Engine');
  }
}
