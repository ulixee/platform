import DatastoreCore from '@ulixee/datastore-core';
import ServiceApiHandler from '../lib/ServiceApiHandler';

export default new ServiceApiHandler('Services.getSetup', {
  handler(request, context) {
    const { datastoreRegistryHost, storageEngineHost, statsTrackerHost } = DatastoreCore.options;
    const { nodeRegistryHost } = context.cloudConfiguration;

    return Promise.resolve({
      storageEngineHost,
      datastoreRegistryHost,
      nodeRegistryHost,
      statsTrackerHost,
    });
  },
});
