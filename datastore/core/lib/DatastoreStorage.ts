import { IAnySchemaJson } from '@ulixee/schema/interfaces/ISchemaJson';
import * as Database from 'better-sqlite3';
import { Database as SqliteDatabase } from 'better-sqlite3';

type ISchema = Record<string, IAnySchemaJson>;

export default class DatastoreStorage {
  public readonly db: SqliteDatabase;
  public readonly path: string;
  #schemasByTableName: { [name: string]: ISchema } = {};
  #schemasByFunctionName: { [name: string]: ISchema } = {};
  #virtualTableNames = new Set<string>();

  constructor(storagePath?: string) {
    if (storagePath) {
      this.db = new Database(storagePath);
    } else {
      this.db = new Database(':memory:');
    }
    this.#schemasByTableName = {};
    this.#schemasByFunctionName = {};
  }

  public get schemasByTableName(): { [name: string]: ISchema } {
    return { ...this.#schemasByTableName };
  }

  public get schemasByFunctionName(): { [name: string]: ISchema } {
    return { ...this.#schemasByFunctionName };
  }

  public isVirtualTable(name: string): boolean {
    return this.#virtualTableNames.has(name);
  }

  public addTableSchema(name: string, schema: ISchema, isVirtual = false): void {
    this.#schemasByTableName[name] = schema;
    if (isVirtual) this.#virtualTableNames.add(name);
  }

  public getTableSchema(name: string): ISchema {
    return this.#schemasByTableName[name];
  }

  public addFunctionSchema(name: string, schema: ISchema): void {
    this.#schemasByFunctionName[name] = schema;
  }

  public getFunctionSchema(name: string): ISchema {
    return this.#schemasByFunctionName[name];
  }
}
