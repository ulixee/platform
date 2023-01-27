import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import DatastoreStorage from '../lib/DatastoreStorage';

export default new DatastoreApiHandler('Datastore.createInMemoryRunner', {
  handler(request, context) {
    if (!context.connectionToClient?.isInternal) {
      throw new Error('You do not have permission to access this endpoint');
    }
    context.connectionToClient.datastoreStorage ??= new DatastoreStorage();
    const storage = context.connectionToClient?.datastoreStorage;
    storage.addRunnerSchema(request.name, request.schema);
    return Promise.resolve({});
  },
});

