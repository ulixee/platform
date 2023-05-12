import Database = require('better-sqlite3');
import { Database as SqliteDatabase, Statement } from 'better-sqlite3';
import type { Batch, Key, KeyQuery, Pair, Query, Datastore } from 'interface-datastore';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { dynamicImport } from './utils';

const InterfaceDatastore =
  dynamicImport<typeof import('interface-datastore')>('interface-datastore');

export default class SqliteDatastore
  extends TypedEventEmitter<{ delete: { key: string } }>
  implements Datastore
{
  private tableName = 'libp2p';

  private putStatement: Statement<[key: string, value: Uint8Array]>;
  private hasStatement: Statement<[key: string]>;
  private allStatement: Statement<[limit: number, offset: number]>;
  private getStatement: Statement<[key: string]>;
  private deleteStatement: Statement<[key: string]>;
  private readonly db: SqliteDatabase;

  constructor(private dbPath: string) {
    super();
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

  close(): Promise<void> {
    this.db?.close();
    return Promise.resolve();
  }

  put(key: Key, val: Uint8Array): Promise<Key> {
    try {
      this.putStatement.run(key.toString(), val);

      return Promise.resolve(key);
    } catch (err: any) {
      return Promise.reject(errCode(err, 'ERR_DB_WRITE_FAILED'));
    }
  }

  get(key: Key): Promise<Uint8Array> {
    let val: Uint8Array | undefined;

    try {
      val = this.getStatement.pluck().get(key.toString()) as Buffer;
    } catch (err: any) {
      return Promise.reject(errCode(err, 'ERR_DB_READ_FAILED'));
    }

    if (val === undefined) {
      const err = new Error('Not Found');
      return Promise.reject(errCode(err, 'ERR_NOT_FOUND'));
    }

    return Promise.resolve(val);
  }

  has(key: Key): Promise<boolean> {
    try {
      const count = this.hasStatement.pluck().get(key.toString()) as number;
      return Promise.resolve(count > 0);
    } catch (err: any) {
      return Promise.reject(errCode(err, 'ERR_DB_READ_FAILED'));
    }
  }

  delete(key: Key): Promise<void> {
    try {
      const keyString = key.toString();
      this.deleteStatement.run(keyString);
      this.emit('delete', { key: keyString });
      return Promise.resolve();
    } catch (err: any) {
      return Promise.reject(errCode(err, 'ERR_DB_WRITE_FAILED'));
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
      commit: () => {
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
        return Promise.resolve();
      },
    };
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

  async *query(q: Query): AsyncIterable<Pair> {
    q.filters ??= [];
    const results = await this.#internalQuery(
      q,
      (key, value) => {
        return { key, value };
      },
      ...q.filters,
    );

    if (Array.isArray(q.orders)) {
      for (const order of q.orders) {
        results.sort(order);
      }
    }

    for (const result of results) yield result;
  }

  async *queryKeys(q: KeyQuery): AsyncIterable<Key> {
    q.filters ??= [];
    const results = await this.#internalQuery(q, key => key, ...q.filters);

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
    ...filters: ((record: T) => boolean)[]
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

      const result = transform(new Key(key), value);
      if (filters.length) {
        const isFiltered = filters.some(x => x(result));
        if (isFiltered) continue;
      }

      results.push(result);
    }
    return results;
  }

  async destroy(): Promise<void> {
    await this.db.exec(`TRUNCATE ${this.tableName}`);
  }
}

function errCode(err: Error, code: string): Error {
  Object.assign(err, { code });
  return err;
}
