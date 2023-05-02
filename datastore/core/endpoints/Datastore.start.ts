import DatastoreApiHandler from '../lib/DatastoreApiHandler';

export default new DatastoreApiHandler('Datastore.start', {
  async handler(request, context): Promise<{ success: boolean }> {
    if (!context.configuration.enableDatastoreWatchMode) {
      throw new Error('Datastore development/watch mode is not activated.');
    }
    const { dbxPath } = request;

    const { datastoreRegistry, storageEngineRegistry } = context;
    const manifest = await datastoreRegistry.startAtPath(dbxPath);

    await storageEngineRegistry.deleteExisting(manifest.versionHash);
    const previous = await datastoreRegistry.getPreviousVersion(manifest.versionHash);

    await storageEngineRegistry.create(context.vm, dbxPath, manifest, previous, request.watch);

    await datastoreRegistry.publishDatastore(manifest.versionHash, 'started');
    context.connectionToClient.once('disconnected', () => datastoreRegistry.stopAtPath(dbxPath));
    return { success: true };
  },
});
