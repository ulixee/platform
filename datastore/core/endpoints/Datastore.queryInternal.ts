import { SqlParser } from '@ulixee/sql-engine';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import DatastoreStorage from '../lib/DatastoreStorage';
import SqlQuery from '../lib/SqlQuery';

export default new DatastoreApiHandler('Datastore.queryInternal', {
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
    const sqlParser = new SqlParser(request.sql);

    if (sqlParser.isInsert() || sqlParser.isUpdate() || sqlParser.isDelete()) {
      const sql = sqlParser.toSql();
      const boundValues = sqlParser.convertToBoundValuesMap(request.boundValues);
      if (sqlParser.hasReturn()) {
        return db.prepare(sql).get(boundValues);
      }
      const result = db.prepare(sql).run(boundValues);
      return { changes: result?.changes };
    }

    if (!sqlParser.isSelect()) throw new Error('Invalid SQL command');

    const boundValues = sqlParser.convertToBoundValuesMap(request.boundValues);
    const sqlQuery = new SqlQuery(sqlParser, storage, db);
    const records = sqlQuery.execute(
      request.inputByFunctionName,
      request.outputByFunctionName,
      request.recordsByVirtualTableName,
      boundValues,
    );

    return Promise.resolve(records);
  },
});
