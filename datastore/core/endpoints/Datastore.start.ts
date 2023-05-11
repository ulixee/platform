import DatastoreApiHandler from '../lib/DatastoreApiHandler';

export default new DatastoreApiHandler('Datastore.start', {
  async handler(request, context): Promise<{ success: boolean }> {
    if (!context.configuration.enableDatastoreWatchMode) {
      throw new Error('Datastore development/watch mode is not activated.');
    }
    const { dbxPath } = request;

    const { datastoreRegistry } = context;
    await datastoreRegistry.startAtPath(dbxPath, request.watch);
    context.connectionToClient.once('disconnected', () => datastoreRegistry.stopAtPath(dbxPath));
    return { success: true };
  },
});
