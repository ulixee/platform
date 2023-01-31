import { SqlGenerator } from '@ulixee/sql-engine';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import DatastoreStorage from '../lib/DatastoreStorage';

export default new DatastoreApiHandler('Datastore.fetchInternalTable', {
  async handler(request, context) {
    if (!context.connectionToClient?.isInternal) {
      throw new Error('You do not have permission to access this endpoint');
    }

    let storage: DatastoreStorage;
    if (request.datastoreVersionHash) {
      storage = await context.datastoreRegistry.getStorage(request.datastoreVersionHash);
    } else {
      context.connectionToClient.datastoreStorage ??= new DatastoreStorage();
      storage = context.connectionToClient.datastoreStorage;
    }

    const schema = storage.getTableSchema(request.name) ?? {};
    const db = storage.db;
    const { sql, boundValues } = SqlGenerator.createWhereClause(
      request.name,
      request.input,
      ['*'],
      1000,
    );
    const results = db.prepare(sql).all(boundValues);

    return SqlGenerator.convertRecordsFromSqlite(results, [schema]);
  },
});
