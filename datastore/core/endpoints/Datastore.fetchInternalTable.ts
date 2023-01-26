import { SqlGenerator, SqlParser } from '@ulixee/sql-engine';
import { IAnySchemaJson } from '@ulixee/schema/interfaces/ISchemaJson';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import DatastoreStorage from '../lib/DatastoreStorage';
import DatastoreVm from '../lib/DatastoreVm';

export default new DatastoreApiHandler('Datastore.fetchInternalTable', {
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
    const fields = ['*'];
    const where: string[] = [];
    const boundValues: string[] = [];

    for (const field of Object.keys(request.input || {})) {
      const value = request.input[field];
      where.push(`"${field}"=?`);
      boundValues.push(value);
    }

    const whereSql = where.length ? `WHERE ${where.join(', ')} ` : '';
    const sql = `SELECT ${fields.join(',')} from "${request.name}" ${whereSql}LIMIT 1000`;  
    
    const sqlParser = new SqlParser(sql, { table: tableName });
    const results = db.prepare(sql).all(sqlParser.convertToBoundValuesSqliteMap(boundValues));

    return SqlGenerator.convertRecordsFromSqlite(results, [schema]);
  },
});
