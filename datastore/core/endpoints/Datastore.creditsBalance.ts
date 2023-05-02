import CreditsTable from '@ulixee/datastore/lib/CreditsTable';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';

export default new DatastoreApiHandler('Datastore.creditsBalance', {
  async handler(
    request,
    context,
  ): Promise<IDatastoreApiTypes['Datastore.creditsBalance']['result']> {
    const datastoreVersion = await context.datastoreRegistry.getByVersionHash(
      request.datastoreVersionHash,
    );
    const storage = context.storageEngineRegistry.get(datastoreVersion);
    const datastore = await context.vm.open(
      datastoreVersion.entrypointPath,
      storage,
      datastoreVersion,
    );
    const credits = await datastore.tables[CreditsTable.tableName].get(request.creditId);
    return { balance: credits?.remainingCredits ?? 0, issuedCredits: credits?.issuedCredits ?? 0 };
  },
});
