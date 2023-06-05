import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import ISqlAdapter from '../interfaces/ISqlAdapter';
import { IDbJsTypes, IDbTypeNames } from '../interfaces/IDbTypes';

export default class SqliteAdapter implements ISqlAdapter {
  toEngineType(type: IDbTypeNames): string {
    const schemaToSqliteTypes = {
      string: 'TEXT',
      number: 'INTEGER',
      boolean: 'INTEGER',
      bigint: 'INTEGER',
      buffer: 'BLOB',
      date: 'TEXT',
      record: 'BLOB',
      object: 'BLOB',
      array: 'BLOB',
    } as const;

    return schemaToSqliteTypes[type];
  }

  fromEngineValue(type: IDbTypeNames, value: any): IDbJsTypes {
    if (value === null || value === undefined) {
      return null;
    }
    if (type === 'boolean') {
      return !!value;
    }
    if (type === 'buffer') {
      return value;
    }
    if (type === 'bigint') {
      return value ? BigInt(value) : null;
    }
    if (type === 'date') {
      return value ? new Date(value) : null;
    }
    if (['record', 'object', 'array'].includes(type)) {
      return value ? TypeSerializer.parse(value) : null;
    }

    return value;
  }

  toEngineValue(type: IDbTypeNames, value: IDbJsTypes): [serialized: any, temporaryType?: IDbTypeNames] {
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
      if (Buffer.isBuffer(value)) {
        return [value, 'buffer'];
      }

      if (typeof value === 'bigint') {
        return [value, 'bigint'];
      }

      if (typeof value === 'boolean') {
        return [value ? 1 : 0, 'boolean'];
      }

      if (value && value instanceof Date) {
        return [(value as Date).toISOString(), 'date'];
      }

      if (value && typeof value === 'object') {
        return [value ? TypeSerializer.stringify(value, { sortKeys: true }) : null, 'object'];
      }
    }

    return [value];
  }
}
