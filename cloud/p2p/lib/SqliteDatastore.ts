import Database = require('better-sqlite3');
import { Database as SqliteDatabase, Statement } from 'better-sqlite3';
import type { Batch, Key, KeyQuery, Pair, Query, Datastore } from 'interface-datastore';
import { dynamicImport } from './utils';

const InterfaceDatastore =
  dynamicImport<typeof import('interface-datastore')>('interface-datastore');

export default class SqliteDatastore implements Datastore {
  private tableName = 'libp2p';

  private putStatement: Statement<[key: string, value: Uint8Array]>;
  private hasStatement: Statement<[key: string]>;
  private allStatement: Statement<[limit: number, offset: number]>;
  private getStatement: Statement<[key: string]>;
  private deleteStatement: Statement<[key: string]>;
  private readonly db: SqliteDatabase;

  constructor(private dbPath: string) {
    this.db = new Database(dbPath);

    this.db.exec(
      `CREATE TABLE IF NOT EXISTS ${this.tableName} (key TEXT PRIMARY KEY, value BLOB NOT NULL)`,
    );
    this.putStatement = this.db.prepare(
      `INSERT OR REPLACE INTO ${this.tableName} ("key","value") VALUES (?,?)`,
    );
    this.getStatement = this.db.prepare(`SELECT "value" FROM ${this.tableName} WHERE "key"=?`);
    this.hasStatement = this.db.prepare(`SELECT COUNT(1) FROM ${this.tableName} WHERE "key"=?`);
    this.deleteStatement = this.db.prepare(`DELETE FROM ${this.tableName} WHERE "key"=?`);
    this.allStatement = this.db.prepare(`SELECT * FROM ${this.tableName} LIMIT ? OFFSET ?`);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async close(): Promise<void> {
    this.db?.close();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async put(key: Key, val: Uint8Array): Promise<Key> {
    try {
      this.putStatement.run(key.toString(), val);

      return key;
    } catch (err: any) {
      throw dbWriteFailedError(err);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async get(key: Key): Promise<Uint8Array> {
    let val: Uint8Array | undefined;

    try {
      val = this.getStatement.pluck().get(key.toString()) as Buffer;
    } catch (err: any) {
      throw dbReadFailedError(err);
    }

    if (val === undefined) {
      throw notFoundError();
    }

    return val;
  }

  async *putMany(source: AsyncGenerator<Pair>): AsyncGenerator<Key> {
    for await (const { key, value } of source) {
      await this.put(key, value);
      yield key;
    }
  }

  async *getMany(source: AsyncGenerator<Key>): AsyncGenerator<Pair> {
    for await (const key of source) {
      yield {
        key,
        value: await this.get(key),
      };
    }
  }

  async *deleteMany(source: AsyncGenerator<Key>): AsyncGenerator<Key> {
    for await (const key of source) {
      await this.delete(key);
      yield key;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async has(key: Key): Promise<boolean> {
    try {
      return (this.hasStatement.pluck().get(key.toString()) as number) > 0;
    } catch (err: any) {
      throw dbReadFailedError(err);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async delete(key: Key): Promise<void> {
    try {
      this.deleteStatement.run(key.toString());
    } catch (err: any) {
      throw dbWriteFailedError(err);
    }
  }

  batch(): Batch {
    const puts: Pair[] = [];
    const dels: Key[] = [];

    return {
      put(key, value) {
        puts.push({ key, value });
      },
      delete(key) {
        dels.push(key);
      },
      // eslint-disable-next-line @typescript-eslint/require-await
      commit: async () => {
        if (this.db == null) {
          throw new Error('Datastore needs to be opened.');
        }

        this.db.transaction(() => {
          const deleteKeys = new Set<string>();
          for (const del of dels) {
            const key = del.toString();
            deleteKeys.add(key);
            this.deleteStatement.run(key);
          }

          for (const put of puts) {
            if (deleteKeys.has(put.key.toString())) continue;
            this.putStatement.run(put.key.toString(), put.value);
          }
        })();
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async *query(q: Query): AsyncIterable<Pair> {
    const records = await this.#internalQuery(q, (key, value) => {
      return { key, value };
    });

    const results: Pair[] = [];
    for (const record of records) {
      if (Array.isArray(q.filters)) {
        const isFiltered = q.filters.some(x => x(record));
        if (isFiltered) continue;
      }
      results.push(record);
    }

    if (Array.isArray(q.orders)) {
      for (const order of q.orders) {
        results.sort(order);
      }
    }

    for (const result of results) yield result;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async *queryKeys(q: KeyQuery): AsyncIterable<Key> {
    const records = await this.#internalQuery(q, key => key);

    const results: Key[] = [];
    for (const record of records) {
      if (Array.isArray(q.filters)) {
        const isFiltered = q.filters.some(x => x(record));
        if (isFiltered) continue;
      }
      results.push(record);
    }

    if (Array.isArray(q.orders)) {
      for (const order of q.orders) {
        results.sort(order);
      }
    }

    for (const result of results) yield result;
  }

  async #internalQuery<T>(
    q: { prefix?: string; offset?: number; limit?: number },
    transform: (key: Key, value: Uint8Array) => T,
  ): Promise<T[]> {
    const { Key } = await InterfaceDatastore;

    const results: T[] = [];
    const all = this.allStatement.all(q.limit ?? 1000, q.offset ?? 0) as {
      key: string;
      value: Uint8Array;
    }[];
    for (const { key, value } of all) {
      if (value == null) continue;
      if (q.prefix != null && !key.startsWith(q.prefix)) continue;

      results.push(transform(new Key(key), value));
    }
    return results;
  }

  async destroy(): Promise<void> {
    await this.db.exec(`TRUNCATE ${this.tableName}`);
  }
}

function dbWriteFailedError(err: Error): Error {
  err = err ?? new Error('Write failed');
  return errCode(err, 'ERR_DB_WRITE_FAILED');
}

function dbReadFailedError(err: Error): Error {
  err = err ?? new Error('Read failed');
  return errCode(err, 'ERR_DB_READ_FAILED');
}

function notFoundError(err?: Error): Error {
  err = err ?? new Error('Not Found');
  return errCode(err, 'ERR_NOT_FOUND');
}

function errCode(err: Error, code: string): Error {
  Object.assign(err, { code });
  return err;
}
