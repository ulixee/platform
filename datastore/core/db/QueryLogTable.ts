import { Database as SqliteDatabase } from 'better-sqlite3';
import SqliteTable from '@ulixee/commons/lib/SqliteTable';
import type IQueryLogEntry from '@ulixee/datastore/interfaces/IQueryLogEntry';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';

export default class QueryLogTable extends SqliteTable<IQueryLogRecord> {
  constructor(db: SqliteDatabase) {
    super(
      db as any,
      'QueryLog',
      [
        ['id', 'TEXT', 'NOT NULL PRIMARY KEY'],
        ['versionHash', 'TEXT', 'NOT NULL'],
        ['query', 'TEXT', 'NOT NULL'],
        ['date', 'DATETIME', 'NOT NULL'],
        ['input', 'TEXT'],
        ['outputs', 'TEXT'],
        ['affiliateId', 'TEXT'],
        ['error', 'TEXT'],
        ['micronoteId', 'TEXT'],
        ['creditId', 'TEXT'],
        ['bytes', 'INTEGER'],
        ['milliseconds', 'INTEGER'],
        ['microgons', 'INTEGER'],
        ['heroSessionIds', 'TEXT'],
      ],
      true,
    );
  }

  public record(
    id: string,
    versionHash: string,
    query: string,
    startTime: number,
    affiliateId: string,
    input: any,
    outputs: any[],
    error: Error,
    micronoteId: string,
    creditId: string,
    microgons: number,
    bytes: number,
    milliseconds: number,
    heroSessionIds: string[],
  ): void {
    microgons ??= 0;

    this.insertNow([
      id,
      versionHash,
      query,
      startTime,
      input ? TypeSerializer.stringify(input) : undefined,
      outputs ? TypeSerializer.stringify(outputs) : undefined,
      affiliateId,
      error ? TypeSerializer.stringify(error) : undefined,
      micronoteId,
      creditId,
      bytes,
      milliseconds,
      microgons,
      heroSessionIds ? TypeSerializer.stringify(heroSessionIds) : undefined,
    ]);
  }
}

export interface IQueryLogRecord extends IQueryLogEntry {
  heroSessionIds: string;
}
