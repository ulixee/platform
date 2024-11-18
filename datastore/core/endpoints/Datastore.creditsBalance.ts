import CreditsTable from '@ulixee/datastore/lib/CreditsTable';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';

export default new DatastoreApiHandler('Datastore.creditsBalance', {
  async handler(
    request,
    context,
  ): Promise<IDatastoreApiTypes['Datastore.creditsBalance']['result']> {
    const datastoreVersion = await context.datastoreRegistry.get(request.id, request.version);
    const storage = context.storageEngineRegistry.get(datastoreVersion, {
      id: request.id,
      version: request.version,
      queryId: context.connectionToClient?.transport.remoteId ?? 'creditsBalance',
    });
    const datastore = await context.vm.open(
      datastoreVersion.runtimePath,
      storage,
      datastoreVersion,
    );
    const credits = await datastore.tables[CreditsTable.tableName].get(request.creditId);
    return {
      balance: credits?.remainingCredits ?? 0n,
      issuedCredits: credits?.issuedCredits ?? 0n,
    };
  },
});
