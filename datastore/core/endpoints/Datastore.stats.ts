import DatastoreApiHandler from '../lib/DatastoreApiHandler';

export default new DatastoreApiHandler('Datastore.stats', {
  async handler(request, context) {
    const datastore = await context.datastoreRegistry.get(request.id);
    const datastoreStats = await context.statsTracker.getForDatastore(datastore);
    const versionStats = await context.statsTracker.getForDatastoreVersion(datastore);
    return {
      byVersion: Object.values(versionStats.statsByEntityName),
      overall: Object.values(datastoreStats.statsByEntityName),
    };
  },
});
