import SqlParser from '@ulixee/sql-parser';
import SqlGenerator from '@ulixee/sql-generator';
import DataboxApiHandler from '../lib/DataboxApiHandler';
import DataboxInMemoryStorage from '../lib/DataboxInMemoryStorage';
import DataboxPackagedStorage from '../lib/DataboxPackagedStorage';
import DataboxStorage from '../lib/DataboxStorage';

export default new DataboxApiHandler('Databox.queryInternalFunction', {
  handler(request, context) {
    let storage: DataboxStorage;
    if (request.databoxVersionHash) {
      const storagePath = context.databoxRegistry.getStoragePath(request.databoxVersionHash);
      storage = new DataboxPackagedStorage(storagePath);
    } else {
      storage = new DataboxInMemoryStorage(request.databoxInstanceId);
    }

    const db = storage.db;
    const functionName = request.name;
    const schema = storage.getFunctionSchema(functionName);
    
    const sqlParser = new SqlParser(request.sql, { function: request.name });
    const unknownNames = sqlParser.functionNames.filter(x => x !== functionName);
    if (unknownNames.length) {
      throw new Error(`Function${unknownNames.length === 1 ? ' does' : 's do'} not exist: ${unknownNames.join(', ')}`);
    }
    
    if (!sqlParser.isSelect()) {
      throw new Error('Invalid SQL command');
    }

    const functionRecords = request.functionRecords;
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

    const sql = sqlParser.toSql();
    const boundValues = sqlParser.convertToBoundValuesMap(request.boundValues);
    const records = db.prepare(sql).all(boundValues);

    SqlGenerator.convertRecordsFromSqlite(records, [schema])
    return Promise.resolve(records);
  },
});
