import { IAnySchemaJson } from '@ulixee/schema/interfaces/ISchemaJson';
import { Database as SqliteDatabase } from 'better-sqlite3';

type ISchema = Record<string, IAnySchemaJson>;

export interface IStorage { 
  db: SqliteDatabase,
  tableSchemaByName: {
    [name: string]: ISchema;
  };
  functionSchemaByName: {
    [name: string]: ISchema;
  };
}

export default class DataboxStorage {
  public readonly db: SqliteDatabase;
  public readonly path: string;
  protected tableSchemaByName: { [name: string]: ISchema };
  protected functionSchemaByName: { [name: string]: ISchema };

  constructor(storage: IStorage) {
    this.db = storage.db;
    this.tableSchemaByName = storage.tableSchemaByName;
    this.functionSchemaByName = storage.functionSchemaByName;
  }

  public addTableSchema(name: string, schema?: ISchema): void {
    this.tableSchemaByName[name] = schema;
  }

  public getTableSchema(name: string): ISchema {
    return this.tableSchemaByName[name];
  }

  public addFunctionSchema(name: string, schema?: ISchema): void {
    this.functionSchemaByName[name] = schema;
  }

  public getFunctionSchema(name: string): ISchema {
    return this.functionSchemaByName[name];
  }
}