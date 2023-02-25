import { SqlParser, SqlGenerator } from '@ulixee/sql-engine';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import DatastoreStorage from '../lib/DatastoreStorage';

export default new DatastoreApiHandler('Datastore.queryInternalFunctionResult', {
  async handler(request, context) {
    if (!context.connectionToClient?.isInternal) {
      throw new Error('You do not have permission to access this endpoint');
    }

    let storage: DatastoreStorage;
    if (request.datastoreVersionHash) {
      storage = await context.datastoreRegistry.getStorage(request.datastoreVersionHash);
    } else {
      context.connectionToClient.datastoreStorage ??= new DatastoreStorage();
      storage = context.connectionToClient?.datastoreStorage;
    }

    const db = storage.db;
    const runnerName = request.name;
    const schema = storage.getFunctionSchema(runnerName);

    const sqlParser = new SqlParser(request.sql, { function: request.name });
    const unknownNames = sqlParser.functionNames.filter(x => x !== runnerName);
    if (unknownNames.length) {
      throw new Error(
        `Runner${
          unknownNames.length === 1 ? '' : 's '
        } is ineligible to run with this api: ${unknownNames.join(', ')}`,
      );
    }

    if (!sqlParser.isSelect()) {
      throw new Error('Invalid SQL command');
    }

    const { input, outputs } = request;
    SqlGenerator.createRunnerFromSchema(input, outputs, schema, (parameters, columns) => {
      db.table(runnerName, {
        parameters,
        columns,
        *rows() {
          const record = outputs.shift();
          if (record) yield SqlGenerator.convertRunnerRecordToSqliteRow(record, schema);
        },
      });
    });

    const sql = sqlParser.toSql();
    const boundValues = sqlParser.convertToBoundValuesSqliteMap(request.boundValues);
    const records = db.prepare(sql).all(boundValues);

    SqlGenerator.convertRecordsFromSqlite(records, [schema]);
    return Promise.resolve(records);
  },
});
