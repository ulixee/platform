import { IAnySchemaJson } from '@ulixee/schema/interfaces/ISchemaJson';
import SqlParser from './Parser';
import { IDbJsTypes } from '../interfaces/IDbTypes';

export default class SqlGenerator {
  public static createWhereClause(
    tableName: string,
    filters: { [field: string]: any },
    fields: string[] = ['*'],
    limit = 1000,
  ): { sql: string; boundValues: IDbJsTypes[] } {
    filters ??= {};
    const where: string[] = Object.keys(filters).map((field, i) => `"${field}"=$${i + 1}`);

    const whereSql = where.length ? `WHERE ${where.join(', ')} ` : '';
    const sql = `SELECT ${fields.join(',')} from "${tableName}" ${whereSql}LIMIT ${limit}`;

    const sqlParser = new SqlParser(sql, { table: tableName });

    const unknownNames = sqlParser.tableNames.filter(x => x !== tableName);
    if (unknownNames.length) {
      throw new Error(
        `Table${unknownNames.length === 1 ? ' does' : 's do'} not exist: ${unknownNames.join(
          ', ',
        )}`,
      );
    }

    return {
      sql: sqlParser.toSql(),
      boundValues: Object.values(filters),
    };
  }

  public static createInsertsFromRecords(
    name: string,
    schema: Record<string, IAnySchemaJson>,
    ...records: Record<string, IDbJsTypes>[]
  ): { sql: string; boundValues: IDbJsTypes[] }[] {
    if (!records?.length) return [];

    return records.map(x => {
      const fields = Object.keys(x);
      const params = fields.map((_, i) => `$${i + 1}`);

      const sql = `INSERT INTO "${name}" (${fields.join(', ')}) VALUES (${params.join(', ')})`;
      return { sql, boundValues: Object.values(x) };
    });
  }
}
