import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import translateDatastoreMetadata from '../lib/translateDatastoreMetadata';

type IResultType = IDatastoreApiTypes['Datastores.list']['result'];
export default new DatastoreApiHandler('Datastores.list', {
  async handler(request, context) {
    const results: IResultType = [];
    const datastores = await context.datastoreRegistry.all();
    for (const datastore of datastores) {
      const result = await translateDatastoreMetadata(datastore, context, true);
      results.push(result);
    }
    return results;
  },
});
