import SqlParser from '@ulixee/sql-parser';
import SqlGenerator from '@ulixee/sql-generator';
import DataboxApiHandler from '../lib/DataboxApiHandler';
import DataboxInMemoryStorage from '../lib/DataboxInMemoryStorage';
import DataboxPackagedStorage from '../lib/DataboxPackagedStorage';
import DataboxStorage from '../lib/DataboxStorage';

export default new DataboxApiHandler('Databox.queryInternalTable', {
  handler(request, context) {
    let storage: DataboxStorage;
    if (request.databoxVersionHash) {
      const storagePath = context.databoxRegistry.getStoragePath(request.databoxVersionHash);
      storage = new DataboxPackagedStorage(storagePath);
    } else {
      storage = new DataboxInMemoryStorage(request.databoxInstanceId);
    }
    
    const db = storage.db;
    const tableName = request.name;
    const schema = storage.getTableSchema(tableName);
    const sqlParser = new SqlParser(request.sql, { table: tableName });
    const unknownNames = sqlParser.tableNames.filter(x => x !== tableName);
    if (unknownNames.length) {
      throw new Error(`Table${unknownNames.length === 1 ? ' does' : 's do'} not exist: ${unknownNames.join(', ')}`);
    }

    if (sqlParser.isInsert()) {
      const sql = sqlParser.toSql();
      const boundValues = sqlParser.convertToBoundValuesMap(request.boundValues);
      db.prepare(sql).run(boundValues);
      return Promise.resolve();
    }
    
    if (!sqlParser.isSelect()) throw new Error('Invalid SQL command');

    const sql = sqlParser.toSql();
    const boundValues = sqlParser.convertToBoundValuesMap(request.boundValues);
    const records = db.prepare(sql).all(boundValues);

    SqlGenerator.convertRecordsFromSqlite(records, [schema]);
    return Promise.resolve(records);
  },
});

