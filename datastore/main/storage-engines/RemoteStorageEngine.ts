import IDatastoreApiTypes from '@ulixee/platform-specification/datastore/DatastoreApis';
import { SqlParser } from '@ulixee/sql-engine';
import { IDbJsTypes } from '@ulixee/sql-engine/interfaces/IDbTypes';
import ConnectionToDatastoreCore from '../connections/ConnectionToDatastoreCore';
import { TQueryCallMeta } from '../interfaces/IStorageEngine';
import AbstractStorageEngine from './AbstractStorageEngine';

export default class RemoteStorageEngine extends AbstractStorageEngine {
  protected connectionToCore: ConnectionToDatastoreCore;
  constructor(readonly storageEngineHost: string) {
    super();
    this.connectionToCore = ConnectionToDatastoreCore.remote(storageEngineHost);
  }

  public override async close(): Promise<void> {
    await this.connectionToCore.disconnect();
  }

  public override async query<TResult>(
    sql: string | SqlParser,
    boundValues: IDbJsTypes[],
    virtualEntitiesByName?: {
      [name: string]: { parameters?: Record<string, any>; records: Record<string, any>[] };
    },
    metadata?: TQueryCallMeta,
  ): Promise<TResult> {
    if (sql instanceof SqlParser) sql = sql.toSql();
    const result = (await this.connectionToCore.sendRequest({
      command: 'Datastore.queryStorageEngine',
      args: [
        {
          sql,
          boundValues,
          virtualEntitiesByName,
          ...metadata,
        },
      ],
    })) as any;

    // TODO: how to surface the payment/other metadata here...
    return result.outputs;
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
