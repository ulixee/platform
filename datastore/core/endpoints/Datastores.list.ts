import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import translateDatastoreMetadata from '../lib/translateDatastoreMetadata';

type IDatastoreList = IDatastoreApiTypes['Datastores.list']['result']['datastores'];
export default new DatastoreApiHandler('Datastores.list', {
  async handler(request, context) {
    const results: IDatastoreList = [];
    // TODO: this method might not return consistent offsets, and this is obviously not optimized
    const datastores = await context.datastoreRegistry.all();
    for (const datastore of datastores.slice(request.offset ?? 0, 100)) {
      const result = await translateDatastoreMetadata(datastore, context, true);
      results.push(result);
    }
    return { datastores: results, count: datastores.length, offset: request.offset };
  },
});
