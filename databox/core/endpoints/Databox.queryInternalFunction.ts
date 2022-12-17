import { SqlParser, SqlGenerator } from '@ulixee/sql-engine';
import DataboxApiHandler from '../lib/DataboxApiHandler';
import DataboxStorage from '../lib/DataboxStorage';

export default new DataboxApiHandler('Databox.queryInternalFunction', {
  handler(request, context) {
    if (!context.connectionToClient?.isInternal) {
      throw new Error('You do not have permission to access this endpoint');
    }

    let storage: DataboxStorage;
    if (request.databoxVersionHash) {
      const storagePath = context.databoxRegistry.getStoragePath(request.databoxVersionHash);
      storage = new DataboxStorage(storagePath);
    } else {
      context.connectionToClient.databoxStorage ??= new DataboxStorage();
      storage = context.connectionToClient?.databoxStorage;
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

    const { input, outputs } = request;
    SqlGenerator.createFunctionFromSchema(input, outputs, schema, (parameters, columns) => {
      db.table(functionName, {
        parameters,
        columns,
        *rows() {
          const record = outputs.shift();
          if (record) yield SqlGenerator.convertFunctionRecordToSqliteRow(record, schema);
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
