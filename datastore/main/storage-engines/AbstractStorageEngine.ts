import { IAnySchemaJson } from '@ulixee/schema/interfaces/ISchemaJson';
import { SqlParser } from '@ulixee/sql-engine';
import { IDbJsTypes, IDbTypeNames } from '@ulixee/sql-engine/interfaces/IDbTypes';
import ISqlAdapter from '@ulixee/sql-engine/interfaces/ISqlAdapter';
import IDatastoreComponents, {
  TCrawlers,
  TExtractors,
  TTables,
} from '../interfaces/IDatastoreComponents';
import IQueryOptions from '../interfaces/IQueryOptions';
import IStorageEngine from '../interfaces/IStorageEngine';
import Datastore from '../lib/Datastore';
import { IQueryInternalCallbacks } from '../lib/DatastoreInternal';

export type ISchema = Record<string, IAnySchemaJson>;

export default abstract class AbstractStorageEngine implements IStorageEngine {
  public readonly inputsByName: { [name: string]: ISchema } = {};
  public readonly schemasByName: { [name: string]: ISchema } = {};
  public readonly virtualTableNames = new Set<string>();
  public readonly sqlTableNames = new Set<string>();

  public abstract close(): Promise<void>;

  protected readonly adapter: ISqlAdapter;
  protected abstract createTable?(name: string, schema: ISchema): Promise<void>;
  protected isBound = false;

  public abstract query<TResult>(
    sql: string | SqlParser,
    boundValues: IDbJsTypes[],
    metadata?: IQueryOptions,
    virtualEntitiesByName?: {
      [name: string]: { parameters?: Record<string, any>; records: Record<string, any>[] };
    },
    callbacks?: IQueryInternalCallbacks,
  ): Promise<TResult>;

  public abstract filterLocalTableCalls(entityCalls: string[]): string[];

  public bind(datastore: IDatastoreComponents<TTables, TExtractors, TCrawlers>): void {
    if (this.isBound) return;
    for (const [name, extractor] of Object.entries(datastore.extractors)) {
      this.schemasByName[name] = extractor.schema?.output ?? {};
      this.inputsByName[name] = extractor.schema?.input ?? {};
    }
    for (const [name, crawler] of Object.entries(datastore.crawlers)) {
      this.schemasByName[name] = crawler.schema?.output ?? {};
      this.inputsByName[name] = crawler.schema?.input ?? {};
    }
    for (const [name, table] of Object.entries(datastore.tables)) {
      this.schemasByName[name] = table.schema;
      if ('remoteSource' in table) this.virtualTableNames.add(name);
      else this.sqlTableNames.add(name);
    }
    Object.freeze(this.schemasByName);
    Object.freeze(this.inputsByName);
    Object.freeze(this.virtualTableNames);
    this.isBound = true;
  }

  public async create(datastore: Datastore, previousVersion?: Datastore): Promise<void> {
    for (const table of Object.values(datastore.tables)) {
      // don't create upstream tables
      if ('remoteSource' in table) continue;

      const schema = table.schema;
      await this.createTable(table.name, schema);
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

  protected recordToEngineRow(
    record: Record<string, IDbJsTypes>,
    schema: Record<string, IAnySchemaJson>,
    inputSchema?: Record<string, IAnySchemaJson>,
    tmpSchemaFieldTypes: { [fieldName: string]: IDbTypeNames } = {},
  ): Record<string, any> {
    for (const key of Object.keys(record)) {
      const fieldSchema = inputSchema?.[key] ?? schema[key];
      const typeName = fieldSchema?.typeName;
      const [convertedValue, tmpType] = this.adapter.toEngineValue(typeName, record[key]);
      record[key] = convertedValue;
      if (tmpType) tmpSchemaFieldTypes[key] = tmpType;
    }
    for (const key of Object.keys(schema || {})) {
      if (key in record) continue;
      record[key] = null;
    }
    return record;
  }

  protected recordsFromEngine<TResult = any[]>(
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

        record[key] = this.adapter.fromEngineValue(field || tmpSchemaFieldTypes[key], record[key]);
      }
    }
    return records as any;
  }
}
