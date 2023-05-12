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

  seedlings: TSchemaType[];
  #datastoreInternal: DatastoreInternal;

  protected readonly components: ITableComponents<TSchema, TSchemaType>;

  constructor(components: ITableComponents<TSchema, TSchemaType>) {
    this.seedlings = components.seedlings;
    this.components = { ...components };
  }

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

  protected get datastoreInternal(): DatastoreInternal {
    if (!this.#datastoreInternal) {
      this.#datastoreInternal = new DatastoreInternal({ tables: { [this.name]: this } });
    }
    return this.#datastoreInternal;
  }

  public async fetchInternal(options: {
    input: ExtractSchemaType<TSchema>;
  }): Promise<TSchemaType[]> {
    const name = this.name;

    const db = this.datastoreInternal.db;
    const { sql, boundValues } = SqlGenerator.createWhereClause(name, options.input, ['*'], 1000);
    const results = db.prepare(sql).all(boundValues);

    return await SqlGenerator.convertRecordsFromSqlite(results, [this.schema]);
  }

  public async queryInternal<T = TSchemaType[]>(sql: string, boundValues: any[] = []): Promise<T> {
    const name = this.name;
    const db = this.datastoreInternal.db;

    const sqlParser = new SqlParser(sql, { table: name });
    sql = sqlParser.toSql();
    const queryValues = sqlParser.convertToBoundValuesSqliteMap(boundValues);

    if (sqlParser.isInsert() || sqlParser.isDelete() || sqlParser.isUpdate()) {
      if (sqlParser.hasReturn()) {
        return db.prepare(sql).get(queryValues) as any;
      }
      const result = db.prepare(sql).run(queryValues);
      return { changes: result?.changes } as any;
    }

    if (!sqlParser.isSelect()) throw new Error('Invalid SQL command');

    const records = db.prepare(sql).all(queryValues);

    return await SqlGenerator.convertRecordsFromSqlite(records, [this.schema]);
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

  public bind(config: IDatastoreBinding): void {
    this.datastoreInternal.bind(config ?? {});
  }
}
addGlobalInstance(Table);
