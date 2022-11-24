import SqlGenerator from '@ulixee/sql-generator';
import DataboxApiHandler from '../lib/DataboxApiHandler';
import DataboxInMemoryStorage from '../lib/DataboxInMemoryStorage';

export default new DataboxApiHandler('Databox.createInMemoryTable', {
  handler(request) {
    const { name, seedlings, schema } = request;
    const storage = new DataboxInMemoryStorage(request.databoxInstanceId);
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

