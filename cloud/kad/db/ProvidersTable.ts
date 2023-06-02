import SqliteTable from '@ulixee/commons/lib/SqliteTable';
import { Database as SqliteDatabase } from 'better-sqlite3';

export default class ProvidersTable extends SqliteTable<IProvidersRecord> {
  constructor(db: SqliteDatabase) {
    super(
      db as any,
      'Providers',
      [
        ['providerNodeId', 'TEXT', 'NOT NULL PRIMARY KEY'],
        ['key', 'BLOB', 'NOT NULL PRIMARY KEY'],
        ['publishedTimestamp', 'DATETIME', 'NOT NULL'],
        ['expirationTimestamp', 'DATETIME', 'NOT NULL'],
      ],
      true,
    );
  }

  public record(record: IProvidersRecord): void {
    this.insertObject(record);
  }

  public updateExpiration(providerNodeId: string, key: Buffer, timestamp: number): void {
    this.db
      .prepare(
        `update ${this.tableName} set expirationTimestamp=$timestamp where providerNodeId=$providerNodeId and key=$key`,
      )
      .run({ providerNodeId, key, timestamp });
  }

  public getWithKey(key: Buffer): IProvidersRecord[] {
    return this.db
      .prepare(`select * from ${this.tableName} where key=$key`)
      .all({ key }) as IProvidersRecord[];
  }

  public delete(providerNodeId: string, key: Buffer): void {
    this.db
      .prepare(`delete from ${this.tableName} where providerNodeId=$providerNodeId and key=$key`)
      .run({ providerNodeId, key });
  }
}

export interface IProvidersRecord {
  providerNodeId: string;
  key: Buffer;
  publishedTimestamp: number;
  expirationTimestamp: number;
}
