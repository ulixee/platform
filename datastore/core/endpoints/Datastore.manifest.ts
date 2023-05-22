import DatastoreApiHandler from '../lib/DatastoreApiHandler';

export default new DatastoreApiHandler('Datastore.manifest', {
  async handler(request, context) {
    return await context.datastoreRegistry.getByVersionHash(request.versionHash);
  },
});
