import { SqlParser } from '@ulixee/sql-engine';
import DataboxApiHandler from '../lib/DataboxApiHandler';
import DataboxStorage from '../lib/DataboxStorage';
import SqlQuery from '../lib/SqlQuery';

export default new DataboxApiHandler('Databox.queryInternal', {
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
    const sqlParser = new SqlParser(request.sql);

    if (sqlParser.isInsert()) {
      const sql = sqlParser.toSql();
      const boundValues = sqlParser.convertToBoundValuesMap(request.boundValues);
      db.prepare(sql).run(boundValues);
      return Promise.resolve();
    }

    if (!sqlParser.isSelect()) throw new Error('Invalid SQL command');

    const boundValues = sqlParser.convertToBoundValuesMap(request.boundValues);
    const sqlQuery = new SqlQuery(sqlParser, storage, db); 
    const records = sqlQuery.execute(request.inputByFunctionName, request.outputByFunctionName, boundValues);

    return Promise.resolve(records);
  },
});
