import DatastoreApiHandler from '../lib/DatastoreApiHandler';

export default new DatastoreApiHandler('Datastore.start', {
  async handler(request, context): Promise<{ success: boolean }> {
    if (!context.configuration.enableDatastoreWatchMode) {
      throw new Error('Datastore development/watch mode is not activated.');
    }
    const { dbxPath } = request;

    await context.datastoreRegistry.startAtPath(dbxPath);
    const registry = context.datastoreRegistry;
    context.connectionToClient.once('disconnected', () => registry.stopAtPath(dbxPath));
    return { success: true };
  },
});
