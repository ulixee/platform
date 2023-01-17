import CreditsTable from '@ulixee/datastore/lib/CreditsTable';
import { IDatastoreApiTypes } from '@ulixee/specification/datastore';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import DatastoreVm from '../lib/DatastoreVm';

export default new DatastoreApiHandler('Datastore.creditsBalance', {
  async handler(
    request,
    context,
  ): Promise<IDatastoreApiTypes['Datastore.creditsBalance']['result']> {
    const datastoreVersion = await context.datastoreRegistry.getByVersionHash(
      request.datastoreVersionHash,
    );
    const datastore = await DatastoreVm.open(datastoreVersion.path, datastoreVersion);
    const credits = await datastore.tables[CreditsTable.tableName].get(request.creditId);
    return { balance: credits?.remainingCredits ?? 0, issuedCredits: credits?.issuedCredits ?? 0 };
  },
});
