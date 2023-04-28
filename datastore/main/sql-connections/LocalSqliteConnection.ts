import SqliteAdapter from '@ulixee/sql-engine/adapters/SqliteAdapter';
import { IDbJsTypes } from '@ulixee/sql-engine/interfaces/IDbTypes';
import ISqlAdapter from '@ulixee/sql-engine/interfaces/ISqlAdapter';
import * as Database from 'better-sqlite3';
import { Database as SqliteDatabase } from 'better-sqlite3';
import ISqlConnection, { IVirtualTableInterface } from '../interfaces/ISqlConnection';

export default class LocalSqliteConnection implements ISqlConnection {
  #db: SqliteDatabase;

  constructor(storagePath = ':memory:') {
    const opts = {}; // { verbose: console.log }
    this.#db = new Database(storagePath, opts);
  }

  createAdapter(): ISqlAdapter {
    return new SqliteAdapter();
  }

  close(): Promise<void> {
    this.#db.close();
    return Promise.resolve();
  }

  createVirtualTable(name: string, options: IVirtualTableInterface): Promise<void> {
    const tableOptions: any = {
      columns: options.columns,
      *rows() {
        for (const row of options.rows) {
          yield row;
        }
      },
    };
    if (options.parameters) tableOptions.parameters = options.parameters;
    this.#db.table(name, tableOptions);
    return Promise.resolve();
  }

  all<T = any>(sql: string, boundValues: IDbJsTypes[]): Promise<T[]> {
    const valueMap = this.convertBoundValuesToMap(boundValues);
    const rows = this.#db.prepare(sql).all(valueMap) as T[];
    return Promise.resolve(rows);
  }

  get<T = any>(sql: string, boundValues: IDbJsTypes[]): Promise<T> {
    const valueMap = this.convertBoundValuesToMap(boundValues);
    return Promise.resolve(this.#db.prepare(sql).get(valueMap) as T);
  }

  run(sql: string, boundValues: IDbJsTypes[]): Promise<{ changes: number }>;
  run<T = any>(sql: string, boundValues: IDbJsTypes[], withReturn: true): Promise<T>;
  run(sql: string, boundValues: IDbJsTypes[], withReturn?: boolean): any {
    const valueMap = this.convertBoundValuesToMap(boundValues);

    if (withReturn === true) {
      return this.#db.prepare(sql).get(valueMap);
    }

    const result = this.#db.prepare(sql).run(valueMap);
    return { changes: result?.changes } as any;
  }

  convertBoundValuesToMap(boundValues: IDbJsTypes[]): Record<string, IDbJsTypes> {
    const record = {} as Record<string, IDbJsTypes>;
    let index = 1;
    for (const value of boundValues) {
      record[index++] = value;
    }
    return record;
  }
}
