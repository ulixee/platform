import DatastoreApiHandler from '../lib/DatastoreApiHandler';

export default new DatastoreApiHandler('Datastore.versions', {
  async handler(request, context) {
    const versions = await context.datastoreRegistry.getVersions(request.id);
    return { versions };
  },
});
