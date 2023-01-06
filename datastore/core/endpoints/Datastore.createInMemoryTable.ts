import { SqlGenerator } from '@ulixee/sql-engine';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import DatastoreStorage from '../lib/DatastoreStorage';

export default new DatastoreApiHandler('Datastore.createInMemoryTable', {
  handler(request, context) {
    if (!context.connectionToClient?.isInternal) {
      throw new Error('You do not have permission to access this endpoint');
    }
    context.connectionToClient.datastoreStorage ??= new DatastoreStorage();
    const storage = context.connectionToClient.datastoreStorage;
    const { name, seedlings, schema } = request;

    storage.addTableSchema(name, request.schema);

    SqlGenerator.createTableFromSchema(name, schema, sql => {
      storage.db.prepare(sql).run();
    });

    SqlGenerator.createInsertsFromSeedlings(name, seedlings, schema, (sql, values) => {
      storage.db.prepare(sql).run(values);
    });

    return Promise.resolve({});
  },
});

