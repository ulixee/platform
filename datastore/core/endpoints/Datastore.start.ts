import * as Path from 'path';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import DatastoreVm from '../lib/DatastoreVm';

export default new DatastoreApiHandler('Datastore.start', {
  async handler(request, context): Promise<{ success: boolean }> {
    if (!context.configuration.enableDatastoreWatchMode) {
      throw new Error('Datastore development/watch mode is not activated.');
    }
    const { dbxPath } = request;

    await context.datastoreRegistry.watchDbxPath(dbxPath);
    DatastoreVm.doNotCacheList.add(Path.join(dbxPath, 'datastore.js'));
    return { success: true };
  },
});
