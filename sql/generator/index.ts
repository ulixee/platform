import { IAnySchemaJson } from '@ulixee/schema/interfaces/ISchemaJson';
import { IFunctionSchema } from '@ulixee/databox';

const zodToSqliteTypes = {
  string: 'TEXT',
  number: 'INTEGER',
  boolean: 'INTEGER',
  bigint: 'INTEGER',
  buffer: 'BLOB',
  date: 'TEXT', 
  record: 'BLOB',
  object: 'BLOB',
  array: 'BLOB',
};

export default class SqlGenerator {
  public static createTableFromSchema(
    name: string, 
    schema: Record<string, IAnySchemaJson>, 
    callback: (sql: string) => void
  ): void {
    const columns = Object.keys(schema).map(key => {
      return `${key} ${this.convertToSqliteType(schema[key].typeName)}`
    });

    callback(`
      CREATE TABLE "${name}" (
        ${columns.join(',\n')}
      )
    `);
  }

  public static createFunctionFromSchema(
    schema: IFunctionSchema,
    callback: (parameters: string[], columns: string[]) => void
  ): void {
    const parameters = Object.keys(schema.input);
    const columns = Object.keys(schema.output);
    callback(parameters, columns);
  }

  public static createInsertsFromSeedlings(
    name: string, 
    seedlings: Record<string, any>, 
    schema: Record<string, IAnySchemaJson>, 
    callback: (sql: string, values: any[]) => void
  ): void {
    seedlings ??= [];
    seedlings.forEach(x => {
      const record = { ...x };
      const fields = Object.keys(record);
      for (const field of fields) {
        record[field] = this.convertToSqliteValue(schema[field].typeName, record[field]);
      }
      const sql = `INSERT INTO "${name}" (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`;
      callback(sql, Object.values(record));
    });
  }

  public static convertFromSqliteValue(type: string, value: any): any {
    if (value === null || value === undefined) {
      return null;
    }
    if (type === 'boolean') {
      return !!value;
    } 
    if (type === 'date') {
      return value ? new Date(value) : null;
    }
    if (['record', 'object', 'array'].includes(type)) {
      return value ? JSON.parse(value) : null;
    }
    
    return value;
  }

  public static convertTableRecordToSqlite(record: any, schema: Record<string, IAnySchemaJson>): any {
    for (const key of Object.keys(record)) {
      record[key] = SqlGenerator.convertToSqliteValue(schema[key].typeName, record[key]);
    }
    return record;
  }

  public static convertFunctionRecordToSqlite(record: any, schema: Record<string, IAnySchemaJson>): any {
    for (const key of Object.keys(record)) {
      const typeName = (schema.input[key] || schema.output[key]).typeName;
      record[key] = SqlGenerator.convertToSqliteValue(typeName, record[key]);
    }
    return record;
  }
  
  public static convertRecordsFromSqlite(records: any[], schemas: Record<string, IAnySchemaJson>[]): any {
    for (const record of records) {
      for (const key of Object.keys(record)) {
        const typeNames = schemas.map(schema => {
          const types = [(schema.input || {})[key], (schema.output || {})[key], schema[key]].filter(x => x);
          return types[0]?.typeName;
        }).filter(x => x);
        // TODO: intelligently handle multiple typeNames
        record[key] = SqlGenerator.convertFromSqliteValue(typeNames[0], record[key]);
      }
    }
    return records;
  }

  public static convertToSqliteType(type: string): string {
    return zodToSqliteTypes[type];
  }

  private static convertToSqliteValue(type: string, value: any): any {
    if (value === undefined || value === null) return null;

    if (type === 'boolean') {
      return value ? 1 : 0;
    } 
    if (type === 'date') {
      return value ? (value as Date).toISOString() : null;
    }
    if (['record', 'object', 'array'].includes(type)) {
      return value ? JSON.stringify(value) : null;
    }
    
    return value;
  }
}