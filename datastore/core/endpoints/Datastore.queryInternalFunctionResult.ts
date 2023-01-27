import { SqlParser, SqlGenerator } from '@ulixee/sql-engine';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import DatastoreStorage from '../lib/DatastoreStorage';

export default new DatastoreApiHandler('Datastore.queryInternalFunctionResult', {
  handler(request, context) {
    if (!context.connectionToClient?.isInternal) {
      throw new Error('You do not have permission to access this endpoint');
    }

    let storage: DatastoreStorage;
    if (request.datastoreVersionHash) {
      const storagePath = context.datastoreRegistry.getStoragePath(request.datastoreVersionHash);
      storage = new DatastoreStorage(storagePath);
    } else {
      context.connectionToClient.datastoreStorage ??= new DatastoreStorage();
      storage = context.connectionToClient?.datastoreStorage;
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
    const boundValues = sqlParser.convertToBoundValuesSqliteMap(request.boundValues);
    const records = db.prepare(sql).all(boundValues);

    SqlGenerator.convertRecordsFromSqlite(records, [schema])
    return Promise.resolve(records);
  },
});
