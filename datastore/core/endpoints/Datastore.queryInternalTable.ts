import { SqlGenerator, SqlParser } from '@ulixee/sql-engine';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import DatastoreStorage from '../lib/DatastoreStorage';

export default new DatastoreApiHandler('Datastore.queryInternalTable', {
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

    const tableName = request.name;
    const schema = storage.getTableSchema(tableName) ?? {};

    const db = storage.db;
    const sqlParser = new SqlParser(request.sql, { table: tableName });
    const unknownNames = sqlParser.tableNames.filter(x => x !== tableName);
    if (unknownNames.length) {
      throw new Error(
        `Table${
          unknownNames.length === 1 ? '' : 's'
        } cannot be queried with this api: ${unknownNames.join(', ')}`,
      );
    }

    if (sqlParser.isInsert() || sqlParser.isDelete() || sqlParser.isUpdate()) {
      const sql = sqlParser.toSql();
      const boundValues = sqlParser.convertToBoundValuesSqliteMap(request.boundValues);
      if (sqlParser.hasReturn()) {
        return db.prepare(sql).get(boundValues);
      }
      const result = db.prepare(sql).run(boundValues);
      return { changes: result?.changes };
    }

    if (!sqlParser.isSelect()) throw new Error('Invalid SQL command');

    const sql = sqlParser.toSql();
    const boundValues = sqlParser.convertToBoundValuesSqliteMap(request.boundValues);
    const records = db.prepare(sql).all(boundValues);

    return SqlGenerator.convertRecordsFromSqlite(records, [schema]);
  },
});
