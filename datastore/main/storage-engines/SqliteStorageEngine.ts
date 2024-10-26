import { IAnySchemaJson } from '@ulixee/schema/interfaces/ISchemaJson';
import { SqlParser } from '@ulixee/sql-engine';
import SqliteAdapter from '@ulixee/sql-engine/adapters/SqliteAdapter';
import { IDbJsTypes, IDbTypeNames } from '@ulixee/sql-engine/interfaces/IDbTypes';
import { Database as SqliteDatabase } from 'better-sqlite3';
import * as Database from 'better-sqlite3';
import IQueryOptions from '../interfaces/IQueryOptions';
import AbstractStorageEngine from './AbstractStorageEngine';

type ISchema = Record<string, IAnySchemaJson>;

export default class SqliteStorageEngine extends AbstractStorageEngine {
  #db: SqliteDatabase;

  public readonly path: string;
  override readonly adapter = new SqliteAdapter();

  constructor(storagePath = ':memory:') {
    super();
    const opts = {}; // { verbose: console.log }
    this.#db = new Database(storagePath, opts);
    this.#db.unsafeMode(false);
    this.#db.pragma('journal_mode = WAL');
    this.#db.pragma('synchronous = FULL');
    this.path = storagePath;
  }

  public override async close(): Promise<void> {
    this.#db.pragma('wal_checkpoint(TRUNCATE)');
    this.#db.close();
  }

  public override filterLocalTableCalls(entityCalls: string[]): string[] {
    return entityCalls.filter(x => this.sqlTableNames.has(x));
  }

  public override query<TResult>(
    sql: string | SqlParser,
    boundValues: IDbJsTypes[],
    _metadata?: IQueryOptions,
    virtualEntitiesByName?: {
      [name: string]: { parameters?: Record<string, any>; records: Record<string, any>[] };
    },
  ): Promise<TResult> {
    const sqlParser = typeof sql === 'string' ? new SqlParser(sql) : sql;
    const schemas: ISchema[] = [];
    const tmpSchemaFieldTypes: { [fieldName: string]: IDbTypeNames } = {};
    for (const name of sqlParser.tableNames) {
      if (this.schemasByName[name]) schemas.push(this.schemasByName[name]);
    }

    if (virtualEntitiesByName) {
      for (const [name, virtualEntity] of Object.entries(virtualEntitiesByName)) {
        const inputSchema = this.inputsByName[name];
        let parameters: string[];
        if (virtualEntity.parameters || inputSchema) {
          parameters = Array.from(
            new Set([
              ...Object.keys(virtualEntity.parameters ?? {}),
              ...Object.keys(inputSchema ?? {}),
            ]),
          );
        }
        const schema = this.schemasByName[name];
        const columns = Array.from(
          new Set([...Object.keys(schema ?? {}), ...Object.keys(virtualEntity.records[0] ?? [])]),
        );
        schemas.push(schema);

        const rows = virtualEntity.records.map(row =>
          this.recordToEngineRow(row, schema, inputSchema, tmpSchemaFieldTypes),
        );

        const tableOptions: any = {
          columns,
          *rows() {
            for (const row of rows) {
              yield row;
            }
          },
        };
        if (parameters) tableOptions.parameters = parameters;
        this.#db.table(name, tableOptions);
      }
    }

    const valueMap = this.convertBoundValuesToMap(boundValues);

    const parsedSql = sqlParser.toSql();
    if (sqlParser.isInsert() || sqlParser.isDelete() || sqlParser.isUpdate()) {
      if (sqlParser.hasReturn() === true) {
        return this.#db.prepare(parsedSql).get(valueMap) as any;
      }

      const result = this.#db.prepare(parsedSql).run(valueMap);
      return { changes: result?.changes } as any;
    }

    if (!sqlParser.isSelect()) throw new Error('Invalid SQL command');
    const records = this.#db.prepare(parsedSql).all(valueMap);

    return Promise.resolve(this.recordsFromEngine(records, schemas, tmpSchemaFieldTypes));
  }

  protected override async createTable(name: string, schema: ISchema): Promise<void> {
    const columns = Object.keys(schema).map(
      key => `${key} ${this.adapter.toEngineType(schema[key].typeName)}`,
    );

    await this.#db.exec(`CREATE TABLE "${name}" (${columns.join(', ')})`);
  }

  private convertBoundValuesToMap(boundValues: IDbJsTypes[]): Record<string, IDbJsTypes> {
    const record = {} as Record<string, IDbJsTypes>;
    let index = 1;
    for (const value of boundValues) {
      record[index++] = this.adapter.toEngineValue(null, value)[0];
    }
    return record;
  }
}
