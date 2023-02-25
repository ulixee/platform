import { SqlGenerator, SqlParser } from '@ulixee/sql-engine';
import { Database as SqliteDatabase } from 'better-sqlite3';
import DatastoreStorage from './DatastoreStorage';

export default class SqlQuery {
  sqlParser: SqlParser;
  storage: DatastoreStorage;
  db: SqliteDatabase;

  constructor(sqlParser: SqlParser, storage: DatastoreStorage, db: SqliteDatabase) {
    this.sqlParser = sqlParser;
    this.storage = storage;
    this.db = db;
  }

  public execute(
    inputByRunnerName: { [name: string]: Record<string, any> },
    outputsByRunnerName: { [name: string]: Record<string, any>[] },
    recordsByVirtualTableName: { [name: string]: Record<string, any>[] },
    boundValues: Record<string, any>,
  ): any[] {
    const schemas = this.sqlParser.tableNames.map(x => this.storage.getTableSchema(x));
    const tmpSchemas = {};
    for (const name of this.sqlParser.functionNames) {
      const input = inputByRunnerName[name];
      const outputs = outputsByRunnerName[name];
      const schema = this.storage.getFunctionSchema(name);
      schemas.push(schema);
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      SqlGenerator.createRunnerFromSchema(input, outputs, schema, (parameters, columns) => {
        this.db.table(name, {
          parameters,
          columns,
          *rows() {
            for (const record of outputs)
              yield SqlGenerator.convertRunnerRecordToSqliteRow(record, schema, tmpSchemas);
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
    const convertedValues = Object.keys(boundValues).reduce((obj, k) => {
      const v = SqlGenerator.convertToSqliteValue(null, boundValues[k])[0];
      return Object.assign(obj, { [k]: v });
    }, {});
    const records = this.db.prepare(sql).all(convertedValues);
    SqlGenerator.convertRecordsFromSqlite(records, schemas, tmpSchemas);

    return records;
  }
}
