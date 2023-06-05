import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import translateDatastoreMetadata from '../lib/translateDatastoreMetadata';

export default new DatastoreApiHandler('Datastore.meta', {
  async handler(request, context) {
    const datastore = await context.datastoreRegistry.getByVersionHash(request.versionHash);
    const stats = await context.statsTracker.getForDatastore(datastore);

    return translateDatastoreMetadata(datastore, stats, context, request.includeSchemasAsJson);
  },
});
