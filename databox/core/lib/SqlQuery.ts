import { SqlGenerator, SqlParser } from "@ulixee/sql-engine";
import { Database as SqliteDatabase } from 'better-sqlite3';
import DataboxStorage from "./DataboxStorage";

export default class SqlQuery {
  sqlParser: SqlParser;
  storage: DataboxStorage;
  db: SqliteDatabase;

  constructor(sqlParser: SqlParser, storage: DataboxStorage, db: SqliteDatabase) {
    this.sqlParser = sqlParser;
    this.storage = storage;
    this.db = db;
  }

  public execute(inputByFunctionName, outputByFunctionName, boundValues): any[] {
    const schemas = this.sqlParser.tableNames.map(x => this.storage.getTableSchema(x));
    const tmpSchemas = {};
    for (const functionName of this.sqlParser.functionNames) {
      const input = inputByFunctionName[functionName];
      const output = outputByFunctionName[functionName];
      const schema = this.storage.getFunctionSchema(functionName);
      schemas.push(schema);
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      SqlGenerator.createFunctionFromSchema(input, output, schema, (parameters, columns) => {
        this.db.table(functionName, {
          parameters,
          columns,
          *rows() {
            const record = output.shift();
            if (record) yield SqlGenerator.convertFunctionRecordToSqliteRow(record, schema, tmpSchemas);
          },
        });
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