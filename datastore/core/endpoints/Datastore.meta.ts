import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import translateDatastoreMetadata from '../lib/translateDatastoreMetadata';

export default new DatastoreApiHandler('Datastore.meta', {
  async handler(request, context) {
    const datastore = await context.datastoreRegistry.getByVersionHash(request.versionHash);

    return translateDatastoreMetadata(datastore, context, request.includeSchemasAsJson);
  },
});
