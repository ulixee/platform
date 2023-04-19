import { SqlGenerator, SqlParser } from '@ulixee/sql-engine';
import { Database as SqliteDatabase } from 'better-sqlite3';
import DatastoreStorage from './DatastoreStorage';

export default class SqlQuery {
  sqlParser: SqlParser;
  storage: DatastoreStorage;
  db: SqliteDatabase;

  constructor(sqlParser: SqlParser, storage: DatastoreStorage) {
    this.sqlParser = sqlParser;
    this.storage = storage;
    this.db = storage.db;
  }

  public execute<TResult = any[]>(
    inputByFunctionName: { [name: string]: Record<string, any> },
    outputsByFunctionName: { [name: string]: Record<string, any>[] },
    recordsByVirtualTableName: { [name: string]: Record<string, any>[] },
    boundValues: Record<string, any>,
  ): TResult {
    const schemas = this.sqlParser.tableNames.map(x => this.storage.getTableSchema(x));
    const tmpSchemas = {};
    for (const name of this.sqlParser.functionNames) {
      const input = inputByFunctionName[name];
      const outputs = outputsByFunctionName[name];
      const schema = this.storage.getFunctionSchema(name);
      schemas.push(schema);
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      SqlGenerator.createFunctionFromSchema(input, outputs, schema, (parameters, columns) => {
        this.db.table(name, {
          parameters,
          columns,
          *rows() {
            for (const record of outputs)
              yield SqlGenerator.convertFunctionRecordToSqliteRow(record, schema, tmpSchemas);
          },
        });
      });
    }
    for (const tableName of Object.keys(recordsByVirtualTableName)) {
      const schema = this.storage.getTableSchema(tableName);
      schemas.push(schema);
      const outputs = recordsByVirtualTableName[tableName];
      this.db.table(tableName, {
        columns: Object.keys(schema),
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        *rows() {
          for (const record of outputs)
            yield SqlGenerator.convertTableRecordToSqlite(record, schema);
        },
      });
    }

    const sql = this.sqlParser.toSql();
    const convertedValues = this.sqlParser.convertToBoundValuesSqliteMap(boundValues);
    const records = this.db.prepare(sql).all(convertedValues);
    SqlGenerator.convertRecordsFromSqlite(records, schemas, tmpSchemas);

    return records as any;
  }
}
