import { SqlParser } from '@ulixee/sql-engine';
import { IAnySchemaJson } from '@ulixee/schema/interfaces/ISchemaJson';
import { IDbJsTypes, IDbTypeNames } from '@ulixee/sql-engine/interfaces/IDbTypes';
import ISqlAdapter from '@ulixee/sql-engine/interfaces/ISqlAdapter';
import IDatastoreComponents, {
  TCrawlers,
  TExtractors,
  TTables,
} from '../interfaces/IDatastoreComponents';
import ISqlConnection from '../interfaces/ISqlConnection';
import Datastore from './Datastore';
import LocalSqliteConnection from '../sql-connections/LocalSqliteConnection';

type ISchema = Record<string, IAnySchemaJson>;

export default class StorageEngine {
  #inputsByName: { [name: string]: ISchema } = {};
  #schemasByName: { [name: string]: ISchema } = {};
  #virtualTableNames = new Set<string>();
  #sqlConnection: ISqlConnection;
  #adapter: ISqlAdapter;

  constructor(sqlConnection: ISqlConnection = new LocalSqliteConnection()) {
    this.#sqlConnection = sqlConnection;
    this.#adapter = sqlConnection.createAdapter();
  }

  public bind(datastore: IDatastoreComponents<TTables, TExtractors, TCrawlers>): void {
    for (const [name, extractor] of Object.entries(datastore.extractors)) {
      this.#schemasByName[name] = extractor.schema?.output ?? {};
      this.#inputsByName[name] = extractor.schema?.input ?? {};
    }
    for (const [name, crawler] of Object.entries(datastore.crawlers)) {
      this.#schemasByName[name] = crawler.schema?.output ?? {};
      this.#inputsByName[name] = crawler.schema?.input ?? {};
    }
    for (const [name, table] of Object.entries(datastore.tables)) {
      this.#schemasByName[name] = table.schema;
      if ('remoteSource' in table) this.#virtualTableNames.add(name);
    }
  }

  public async create(datastore: Datastore, previousVersion?: Datastore): Promise<void> {
    for (const table of Object.values(datastore.tables)) {
      // don't create upstream tables
      if ('remoteSource' in table) continue;

      const schema = table.schema;
      const columns = Object.keys(schema).map(
        key => `${key} ${this.#adapter.toEngineType(schema[key].typeName)}`,
      );

      await this.#sqlConnection.run(`CREATE TABLE "${table.name}" (${columns.join(', ')})`, []);
      await table.onCreated?.call(table);
    }
    await datastore.onCreated?.call(datastore);

    if (previousVersion) {
      for (const table of Object.values(datastore.tables)) {
        const previousTable = previousVersion.tables[table.name];
        if (previousTable) await table.onVersionMigrated?.call(table, previousTable);
      }
      await datastore.onVersionMigrated?.call(datastore, previousVersion);
    }
  }

  public async close(): Promise<void> {
    await this.#sqlConnection.close();
  }

  public async query<TResult>(
    sql: string | SqlParser,
    boundValues: IDbJsTypes[],
    virtualEntitiesByName?: {
      [name: string]: { input?: Record<string, any>; records: Record<string, any>[] };
    },
  ): Promise<TResult> {
    const sqlParser = typeof sql === 'string' ? new SqlParser(sql) : sql;
    const schemas: ISchema[] = [];
    const tmpSchemaFieldTypes: { [fieldName: string]: IDbTypeNames } = {};
    for (const name of sqlParser.tableNames) {
      if (this.#schemasByName[name]) schemas.push(this.#schemasByName[name]);
    }

    if (virtualEntitiesByName) {
      for (const [name, virtualEntity] of Object.entries(virtualEntitiesByName)) {
        const inputSchema = this.#inputsByName[name];
        let parameters: string[];
        if (virtualEntity.input || inputSchema) {
          parameters = Array.from(
            new Set([...Object.keys(virtualEntity.input ?? {}), ...Object.keys(inputSchema ?? {})]),
          );
        }
        const schema = this.#schemasByName[name];
        const columns = Array.from(
          new Set([...Object.keys(schema ?? {}), ...Object.keys(virtualEntity.records[0] ?? [])]),
        );
        schemas.push(schema);
        const rows = virtualEntity.records.map(x =>
          this.recordToEngineRow(x, schema, inputSchema, tmpSchemaFieldTypes),
        );

        await this.#sqlConnection.createVirtualTable(name, {
          columns,
          parameters,
          rows,
        });
      }
    }

    boundValues = boundValues.map(x => this.#adapter.toEngineValue(null, x)[0]);
    const parsedSql = sqlParser.toSql();
    if (sqlParser.isInsert() || sqlParser.isDelete() || sqlParser.isUpdate()) {
      return (await this.#sqlConnection.run(parsedSql, boundValues, sqlParser.hasReturn())) as any;
    }

    if (!sqlParser.isSelect()) throw new Error('Invalid SQL command');

    const records = await this.#sqlConnection.all(parsedSql, boundValues);

    return this.recordsFromEngine(records, schemas, tmpSchemaFieldTypes);
  }

  public isVirtualTable(name: string): boolean {
    return this.#virtualTableNames.has(name);
  }

  public getSchema(name: string): ISchema {
    return this.#schemasByName[name];
  }

  private recordToEngineRow(
    record: Record<string, IDbJsTypes>,
    schema: Record<string, IAnySchemaJson>,
    inputSchema?: Record<string, IAnySchemaJson>,
    tmpSchemaFieldTypes: { [fieldName: string]: IDbTypeNames } = {},
  ): Record<string, any> {
    for (const key of Object.keys(record)) {
      const fieldSchema = inputSchema?.[key] ?? schema[key];
      const typeName = fieldSchema?.typeName;
      const [convertedValue, tmpType] = this.#adapter.toEngineValue(typeName, record[key]);
      record[key] = convertedValue;
      if (tmpType) tmpSchemaFieldTypes[key] = tmpType;
    }
    for (const key of Object.keys(schema || {})) {
      if (key in record) continue;
      record[key] = null;
    }
    return record;
  }

  private recordsFromEngine<TResult = any[]>(
    records: any[],
    schemas: Record<string, IAnySchemaJson>[],
    tmpSchemaFieldTypes: { [fieldName: string]: IDbTypeNames } = {},
  ): TResult {
    const schemasByField: Record<string, IAnySchemaJson> = {};
    for (const schema of schemas) {
      for (const [field, entry] of Object.entries(schema)) {
        schemasByField[field] = entry;
      }
    }
    for (const record of records) {
      for (const key of Object.keys(record)) {
        // TODO: intelligently handle multiple typeNames
        const field = schemasByField[key]?.typeName;

        record[key] = this.#adapter.fromEngineValue(field || tmpSchemaFieldTypes[key], record[key]);
      }
    }
    return records as any;
  }
}
