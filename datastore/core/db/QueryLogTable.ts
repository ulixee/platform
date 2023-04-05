import { Database as SqliteDatabase } from 'better-sqlite3';
import SqliteTable from '@ulixee/commons/lib/SqliteTable';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';

export default class QueryLogTable extends SqliteTable<IQueryLogRecord> {
  constructor(db: SqliteDatabase) {
    super(
      db,
      'QueryLog',
      [
        ['id', 'TEXT', 'NOT NULL PRIMARY KEY'],
        ['versionHash', 'TEXT', 'NOT NULL'],
        ['query', 'TEXT', 'NOT NULL'],
        ['date', 'DATETIME', 'NOT NULL'],
        ['input', 'TEXT', 'NOT NULL'],
        ['outputs', 'TEXT'],
        ['affiliateId', 'TEXT'],
        ['error', 'TEXT'],
        ['usedCredits', 'INTEGER'],
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
    microgons: number,
    bytes: number,
    milliseconds: number,
    usedCredits: boolean,
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
      usedCredits ? 1 : 0,
      bytes,
      milliseconds,
      microgons,
      heroSessionIds ? TypeSerializer.stringify(heroSessionIds) : undefined,
    ]);
  }
}

export interface IQueryLogRecord {
  id: string;
  versionHash: string;
  date: Date;
  query: string;
  input: string;
  affiliateId: string;
  outputs: string;
  error: string;
  milliseconds: number;
  bytes: number;
  microgons: number;
  usedCredits: boolean;
  heroSessionIds: string;
}
