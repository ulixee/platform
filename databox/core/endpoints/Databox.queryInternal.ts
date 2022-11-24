import SqlParser from '@ulixee/sql-parser';
import SqlGenerator from '@ulixee/sql-generator';
import DataboxApiHandler from '../lib/DataboxApiHandler';
import DataboxInMemoryStorage from '../lib/DataboxInMemoryStorage';
import DataboxPackagedStorage from '../lib/DataboxPackagedStorage';
import DataboxStorage from '../lib/DataboxStorage';

export default new DataboxApiHandler('Databox.queryInternal', {
  handler(request, context) {
    let storage: DataboxStorage;
    if (request.databoxVersionHash) {
      const storagePath = context.databoxRegistry.getStoragePath(request.databoxVersionHash);
      storage = new DataboxPackagedStorage(storagePath);
    } else {
      storage = new DataboxInMemoryStorage(request.databoxInstanceId);
    }
    const db = storage.db;
    const sqlParser = new SqlParser(request.sql);

    if (sqlParser.isInsert()) {
      const sql = sqlParser.toSql();
      const boundValues = sqlParser.convertToBoundValuesMap(request.boundValues);
      db.prepare(sql).run(boundValues);
      return Promise.resolve();
    }

    if (!sqlParser.isSelect()) throw new Error('Invalid SQL command');

    const schemas = sqlParser.tableNames.map(x => storage.getTableSchema(x));
    for (const functionName of sqlParser.functionNames) {
      const functionRecords = request.functionRecordsByName[functionName];
      const schema = storage.getFunctionSchema(functionName);
      schemas.push(schema);
      SqlGenerator.createFunctionFromSchema(schema, (parameters, columns) => {
        db.table(functionName, {
          parameters,
          columns,
          *rows() {
            const record = functionRecords.shift();
            if (record) yield SqlGenerator.convertFunctionRecordToSqlite(record, schema);
          },
        });
      });
    }

    const sql = sqlParser.toSql();
    const boundValues = sqlParser.convertToBoundValuesMap(request.boundValues);
    const records = db.prepare(sql).all(boundValues);

    SqlGenerator.convertRecordsFromSqlite(records, schemas);
    return Promise.resolve(records);
  },
});
