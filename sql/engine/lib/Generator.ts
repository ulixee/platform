import { IAnySchemaJson } from '@ulixee/schema/interfaces/ISchemaJson';
import { IFunctionSchema } from '@ulixee/datastore';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';

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
    callback: (sql: string) => void,
  ): void {
    const columns = Object.keys(schema).map(key => {
      return `${key} ${this.convertToSqliteType(schema[key].typeName)}`;
    });

    callback(`
      CREATE TABLE IF NOT EXISTS "${name}" (
        ${columns.join(',\n')}
      )
    `);
  }

  public static createFunctionFromSchema(
    input: Record<string, any>,
    outputRecords: Record<string, any>[],
    schema: IFunctionSchema,
    callback: (parameters: string[], columns: string[]) => void,
  ): void {
    const parameters = Array.from(
      new Set([...Object.keys(schema?.input || {}), ...Object.keys(input || {})]),
    );
    const columns = Array.from(
      new Set([...Object.keys(schema?.output || {}), ...Object.keys(outputRecords[0])]),
    );
    callback(parameters, columns);
  }

  public static createInsertStatement(
    tableName: string,
    schema: Record<string, IAnySchemaJson>,
    record: Record<string, any>,
  ): { sql: string; values: any[] } {
    const fields = Object.keys(record);

    const convertedRecord: Record<string, any> = {};
    for (const field of fields) {
      const [convertedValue] = this.convertToSqliteValue(schema[field].typeName, record[field]);
      convertedRecord[field] = convertedValue;
    }
    const sql = `INSERT INTO "${tableName}" (${fields.join(', ')}) VALUES (${fields
      .map((_, i) => `$${i + 1}`)
      .join(', ')})`;
    return { sql, values: Object.values(convertedRecord) };
  }

  public static createInsertsFromSeedlings(
    name: string,
    seedlings: Record<string, any>,
    schema: Record<string, IAnySchemaJson>,
    callback: (sql: string, values: any[]) => void,
  ): void {
    seedlings ??= [];
    seedlings.forEach(x => {
      const record = { ...x };
      const fields = Object.keys(record);
      for (const field of fields) {
        const [convertedValue] = this.convertToSqliteValue(schema[field].typeName, record[field]);
        record[field] = convertedValue;
      }
      const sql = `INSERT INTO "${name}" (${fields.join(', ')}) VALUES (${fields
        .map(() => '?')
        .join(', ')})`;
      callback(sql, Object.values(record));
    });
  }

  public static convertTableRecordToSqlite(
    record: any,
    schema: Record<string, IAnySchemaJson>,
  ): any {
    for (const key of Object.keys(record)) {
      const [convertedValue] = SqlGenerator.convertToSqliteValue(schema[key].typeName, record[key]);
      record[key] = convertedValue;
    }
    return record;
  }

  public static convertFunctionRecordToSqliteRow(
    record: Record<string, any>,
    schema: Record<string, IAnySchemaJson>,
    tmpSchema: any = {},
  ): any {
    for (const key of Object.keys(record)) {
      const { input, output } = schema;
      const schemaItem = (input && input[key]) || (output && output[key]);
      const typeName = schemaItem?.typeName;
      const [convertedValue, tmpType] = SqlGenerator.convertToSqliteValue(typeName, record[key]);
      record[key] = convertedValue;
      if (tmpType) tmpSchema[key] = tmpType;
    }
    for (const key of Object.keys(schema.output || {})) {
      if (key in record) continue;
      record[key] = null;
    }
    return record;
  }

  public static convertRecordsFromSqlite(
    records: any[],
    schemas: Record<string, IAnySchemaJson>[],
    tmpSchema: any = {},
  ): any {
    for (const record of records) {
      for (const key of Object.keys(record)) {
        const typeNames = schemas
          .map(schema => {
            const types = [
              (schema.input || {})[key],
              (schema.output || {})[key],
              schema[key],
            ].filter(x => x);
            return types[0]?.typeName;
          })
          .filter(x => x);
        // TODO: intelligently handle multiple typeNames
        record[key] = SqlGenerator.convertFromSqliteValue(
          typeNames[0] || tmpSchema[key],
          record[key],
        );
      }
    }
    return records;
  }

  public static convertToSqliteType(type: string): string {
    return zodToSqliteTypes[type];
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
      return value ? TypeSerializer.parse(value) : null;
    }

    return value;
  }

  public static convertToSqliteValue(type: string, value: any): [any, (string | undefined)?] {
    if (value === undefined || value === null) return [null];

    if (type === 'boolean') {
      return [value ? 1 : 0];
    }
    if (type === 'date') {
      return [value ? (value as Date).toISOString() : null];
    }
    if (['record', 'object', 'array'].includes(type)) {
      return [value ? TypeSerializer.stringify(value, { sortKeys: true }) : null];
    }

    if (type === undefined || type === null) {
      if (typeof value === 'boolean') {
        return [value ? 1 : 0, 'boolean'];
      }
    }

    return [value];
  }
}
