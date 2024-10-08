import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import translateDatastoreMetadata from '../lib/translateDatastoreMetadata';

export default new DatastoreApiHandler('Datastore.meta', {
  async handler(request, context) {
    const datastore = await context.datastoreRegistry.get(request.id, request.version);
    const stats = await context.statsTracker.getForDatastoreVersion(datastore);
    const paymentInfo = await context.argonPaymentProcessor?.getPaymentInfo();

    return translateDatastoreMetadata(datastore, stats, request.includeSchemasAsJson, paymentInfo);
  },
});
