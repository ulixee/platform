import * as Database from 'better-sqlite3';
import { Database as SqliteDatabase } from 'better-sqlite3';
import { SqlGenerator } from '@ulixee/sql-engine';
import { IAnySchemaJson } from '@ulixee/schema/interfaces/ISchemaJson';
import Table from './Table';
import PassthroughTable from './PassthroughTable';
import IDatastoreComponents, {
  TCrawlers,
  TRunners,
  TTables,
} from '../interfaces/IDatastoreComponents';

type ISchema = Record<string, IAnySchemaJson>;

export default class DatastoreStorage {
  public readonly db: SqliteDatabase;
  public readonly path: string;
  #schemasByTableName: { [name: string]: ISchema } = {};
  #schemasByFunctionName: { [name: string]: ISchema } = {};
  #virtualTableNames = new Set<string>();
  #isOpened = false;

  constructor(storagePath = ':memory:') {
    this.db = new Database(storagePath);
    this.#schemasByTableName = {};
    this.#schemasByFunctionName = {};
  }

  public open(datastore: IDatastoreComponents<TTables, TRunners, TCrawlers>): void {
    if (this.#isOpened) return;
    for (const [name, runner] of Object.entries(datastore.runners)) {
      this.#schemasByFunctionName[name] = runner.schema ?? {};
    }
    for (const [name, crawler] of Object.entries(datastore.crawlers)) {
      this.#schemasByFunctionName[name] = crawler.schema ?? {};
    }
    for (const [name, table] of Object.entries(datastore.tables)) {
      if (!table.isPublic) continue;
      this.addTable(name, table);
    }
    this.#isOpened = true;
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

  public getTableSchema(name: string): ISchema {
    return this.#schemasByTableName[name];
  }

  public getFunctionSchema(name: string): ISchema {
    return this.#schemasByFunctionName[name];
  }

  private addTable(name: string, table: Table): void {
    if (this.#schemasByTableName[name]) return;
    this.#schemasByTableName[name] = table.schema;
    if ((table as PassthroughTable<any, any>).remoteSource) this.#virtualTableNames.add(name);
    if (this.db.memory) {
      SqlGenerator.createTableFromSchema(name, table.schema, sql => {
        this.db.prepare(sql).run();
      });

      SqlGenerator.createInsertsFromSeedlings(
        name,
        table.seedlings,
        table.schema,
        (sql, values) => {
          this.db.prepare(sql).run(values);
        },
      );
    }
  }
}
