import CreditsTable from '@ulixee/datastore/lib/CreditsTable';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import DatastoreVm from '../lib/DatastoreVm';

export default new DatastoreApiHandler('Datastore.creditsIssued', {
  async handler(
    request,
    context,
  ): Promise<IDatastoreApiTypes['Datastore.creditsIssued']['result']> {
    const datastoreVersion = await context.datastoreRegistry.getByVersionHash(
      request.datastoreVersionHash,
    );
    const storage = context.datastoreRegistry.getStorage(request.datastoreVersionHash);
    const datastore = await DatastoreVm.open(datastoreVersion.path, storage, datastoreVersion);
    const { count, microgons } = await datastore.tables[CreditsTable.tableName].summary();
    return { count, issuedCredits: microgons ?? 0 };
  },
});
