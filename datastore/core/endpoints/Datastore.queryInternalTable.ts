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

      const { registryEntry, manifest } = await context.datastoreRegistry.loadVersion(
        request.datastoreVersionHash,
      );
      const datastore = await DatastoreVm.open(registryEntry.path, manifest);
      storage = new DatastoreStorage(storagePath);
      schema = datastore.metadata.tablesByName[tableName].schema;
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
