import CreditsTable from '@ulixee/datastore/lib/CreditsTable';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';

export default new DatastoreApiHandler('Datastore.creditsIssued', {
  async handler(
    request,
    context,
  ): Promise<IDatastoreApiTypes['Datastore.creditsIssued']['result']> {
    const datastoreVersion = await context.datastoreRegistry.getByVersionHash(
      request.datastoreVersionHash,
    );
    const storage = context.storageEngineRegistry.get(datastoreVersion);
    const datastore = await context.vm.open(
      datastoreVersion.entrypointPath,
      storage,
      datastoreVersion,
    );
    const { count, microgons } = await datastore.tables[CreditsTable.tableName].summary();
    return { count, issuedCredits: microgons ?? 0 };
  },
});
