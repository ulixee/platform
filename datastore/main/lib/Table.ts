import { ExtractSchemaType, ISchemaAny } from '@ulixee/schema';
import { SqlGenerator, SqlParser } from '@ulixee/sql-engine';
import addGlobalInstance from '@ulixee/commons/lib/addGlobalInstance';
import ITableComponents from '../interfaces/ITableComponents';
import DatastoreInternal, { IDatastoreBinding } from './DatastoreInternal';

export type IExpandedTableSchema<T> = T extends Record<string, ISchemaAny>
  ? {
      [K in keyof T]: T[K];
    }
  : never;

export default class Table<
  TSchema extends IExpandedTableSchema<any> = IExpandedTableSchema<any>,
  TSchemaType extends ExtractSchemaType<TSchema> = ExtractSchemaType<TSchema>,
> {
  // dummy type holders
  declare readonly schemaType: TSchemaType;

  #datastoreInternal: DatastoreInternal;

  protected readonly components: ITableComponents<TSchema>;

  public get isPublic(): boolean {
    return this.components.isPublic !== false;
  }

  public get schema(): TSchema {
    return this.components.schema;
  }

  public get name(): string {
    return this.components.name ?? 'default';
  }

  public get description(): string | undefined {
    return this.components.description;
  }

  constructor(components: ITableComponents<TSchema>) {
    this.components = { ...components };
  }

  public onCreated(): Promise<void> {
    return this.components.onCreated?.call(this);
  }

  public onVersionMigrated(previousVersion: Table<TSchema>): Promise<void> {
    return this.components.onVersionMigrated?.call(this, previousVersion);
  }

  protected get datastoreInternal(): DatastoreInternal {
    if (!this.#datastoreInternal) {
      this.#datastoreInternal = new DatastoreInternal({ tables: { [this.name]: this } });
    }
    return this.#datastoreInternal;
  }

  public async fetchInternal(options?: { input: TSchemaType }): Promise<TSchemaType[]> {
    const name = this.name;

    const engine = this.datastoreInternal.storageEngine;
    const { sql, boundValues } = SqlGenerator.createWhereClause(name, options?.input, ['*'], 1000);
    return await engine.query(sql, boundValues);
  }

  public async insertInternal(...records: TSchemaType[]): Promise<void> {
    const engine = this.datastoreInternal.storageEngine;
    const inserts = SqlGenerator.createInsertsFromRecords(this.name, this.schema, ...records);
    for (const { sql, boundValues } of inserts) {
      await engine.query(sql, boundValues);
    }
  }

  public async queryInternal<T = TSchemaType[]>(sql: string, boundValues: any[] = []): Promise<T> {
    const name = this.name;
    const engine = this.datastoreInternal.storageEngine;

    const sqlParser = new SqlParser(sql, { table: name });
    return await engine.query(sqlParser, boundValues);
  }

  public attachToDatastore(
    datastoreInternal: DatastoreInternal<any, any>,
    tableName: string,
  ): void {
    this.components.name = tableName;
    if (this.#datastoreInternal && this.#datastoreInternal === datastoreInternal) return;
    if (this.#datastoreInternal) {
      throw new Error(`${tableName} Table is already attached to a Datastore`);
    }

    this.#datastoreInternal = datastoreInternal;
  }

  public bind(config: IDatastoreBinding): Promise<DatastoreInternal> {
    return this.datastoreInternal.bind(config ?? {});
  }
}
addGlobalInstance(Table);
