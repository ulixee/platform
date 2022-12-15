import { SqlGenerator } from '@ulixee/sql-engine';
import DataboxApiHandler from '../lib/DataboxApiHandler';
import DataboxStorage from '../lib/DataboxStorage';

export default new DataboxApiHandler('Databox.createInMemoryTable', {
  handler(request, context) {
    if (!context.connectionToClient?.isInternal) {
      throw new Error('You do not have permission to access this endpoint');
    }
    context.connectionToClient.databoxStorage ??= new DataboxStorage();
    const storage = context.connectionToClient?.databoxStorage;
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

