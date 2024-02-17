import IEscrowApiTypes, {
  EscrowApisSchema,
} from '@ulixee/platform-specification/datastore/EscrowApis';
import ValidatingApiHandler from '@ulixee/platform-specification/utils/ValidatingApiHandler';
import IDatastoreApiContext from '../interfaces/IDatastoreApiContext';

export default new ValidatingApiHandler('Escrow.register', EscrowApisSchema, {
  async handler(
    request,
    context: IDatastoreApiContext,
  ): Promise<IEscrowApiTypes['Escrow.register']['result']> {
    const manifest = await context.datastoreRegistry.get(request.datastoreId);
    if (!manifest) throw new Error(`Unknown datastore requested ${request.datastoreId}`);
    await context.escrowSpendTracker.importEscrow(request, manifest);
    return { accepted: true };
  },
});
