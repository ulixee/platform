import { SqlGenerator, SqlParser } from '@ulixee/sql-engine';
import { IAnySchemaJson } from '@ulixee/schema/interfaces/ISchemaJson';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import DatastoreStorage from '../lib/DatastoreStorage';
import DatastoreVm from '../lib/DatastoreVm';

export default new DatastoreApiHandler('Datastore.queryInternalTable', {
  async handler(request, context) {
    if (!context.connectionToClient?.isInternal) {
      throw new Error('You do not have permission to access this endpoint');
    }

    const tableName = request.name;
    let storage: DatastoreStorage;
    let schema: Record<string, IAnySchemaJson>;
    if (request.datastoreVersionHash) {
      const storagePath = context.datastoreRegistry.getStoragePath(request.datastoreVersionHash);

      const datastoreVersion = await context.datastoreRegistry.getByVersionHash(
        request.datastoreVersionHash,
      );
      const datastore = await DatastoreVm.open(datastoreVersion.path, datastoreVersion);
      storage = new DatastoreStorage(storagePath);
      schema = datastore.tables[tableName].schema;
    } else {
      context.connectionToClient.datastoreStorage ??= new DatastoreStorage();
      storage = context.connectionToClient?.datastoreStorage;
      schema = storage.getTableSchema(tableName);
    }

    const db = storage.db;
    const sqlParser = new SqlParser(request.sql, { table: tableName });
    const unknownNames = sqlParser.tableNames.filter(x => x !== tableName);
    if (unknownNames.length) {
      throw new Error(
        `Table${unknownNames.length === 1 ? ' does' : 's do'} not exist: ${unknownNames.join(
          ', ',
        )}`,
      );
    }

    if (sqlParser.isInsert() || sqlParser.isDelete() || sqlParser.isUpdate()) {
      const sql = sqlParser.toSql();
      const boundValues = sqlParser.convertToBoundValuesMap(request.boundValues);
      if (sqlParser.hasReturn()) {
        return db.prepare(sql).get(boundValues);
      }
      const result = db.prepare(sql).run(boundValues);
      return { changes: result?.changes };
    }

    if (!sqlParser.isSelect()) throw new Error('Invalid SQL command');

    const sql = sqlParser.toSql();
    const boundValues = sqlParser.convertToBoundValuesMap(request.boundValues);
    const records = db.prepare(sql).all(boundValues);

    return SqlGenerator.convertRecordsFromSqlite(records, [schema]);
  },
});
