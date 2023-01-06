import { IAnySchemaJson } from '@ulixee/schema/interfaces/ISchemaJson';
import { Database as SqliteDatabase } from 'better-sqlite3';
import * as Database from 'better-sqlite3';

type ISchema = Record<string, IAnySchemaJson>;

export default class DatastoreStorage {
  private static databasesByPath: { [path: string]: SqliteDatabase } = {};

  public readonly db: SqliteDatabase;
  public readonly path: string;
  #schemasByTableName: { [name: string]: ISchema } = {};
  #schemasByFunctionName: { [name: string]: ISchema } = {};

  constructor(storagePath?: string) {
    if (storagePath) {
      DatastoreStorage.databasesByPath[storagePath] ??= new Database(storagePath);
      this.db = DatastoreStorage.databasesByPath[storagePath];
    } else {
      this.db = new Database(':memory:');
    }
    this.#schemasByTableName = {};
    this.#schemasByFunctionName = {};
  }

  public get schemasByTableName(): { [name: string]: ISchema } {
    return { ...this.#schemasByTableName}
  }

  public get schemasByFunctionName(): { [name: string]: ISchema } {
    return { ...this.#schemasByFunctionName}
  }

  public addTableSchema(name: string, schema: ISchema): void {
    this.#schemasByTableName[name] = schema;
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

  public static close(path: string): void {
    if (!this.databasesByPath[path]) return;
    this.databasesByPath[path].close();
    delete this.databasesByPath[path];
  }

  public static closeAll(): void {
    for (const path of Object.keys(this.databasesByPath)) {
      this.databasesByPath[path].close();
      delete this.databasesByPath[path];
    }
  }
}
