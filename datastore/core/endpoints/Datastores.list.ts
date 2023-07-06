import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';

type IDatastoreList = IDatastoreApiTypes['Datastores.list']['result']['datastores'];
export default new DatastoreApiHandler('Datastores.list', {
  async handler(request, context) {
    const results: IDatastoreList = [];

    const { datastores, total } = await context.datastoreRegistry.list(100, request.offset);
    for (const datastore of datastores) {
      const stats = await context.statsTracker.getSummary(datastore.id);
      results.push({
        version: datastore.version,
        versionTimestamp: datastore.versionTimestamp,
        id: datastore.id,
        description: datastore.description,
        isStarted: datastore.isStarted,
        scriptEntrypoint: datastore.scriptEntrypoint,
        domain: datastore.domain,
        name: datastore.name,
        stats: stats.stats,
      });
    }
    return { datastores: results, total, offset: request.offset };
  },
});
