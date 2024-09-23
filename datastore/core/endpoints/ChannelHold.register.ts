import IChannelHoldApiTypes, {
  ChannelHoldApisSchema,
} from '@ulixee/platform-specification/datastore/ChannelHoldApis';
import ValidatingApiHandler from '@ulixee/platform-specification/utils/ValidatingApiHandler';
import IDatastoreApiContext from '../interfaces/IDatastoreApiContext';

export default new ValidatingApiHandler('ChannelHold.register', ChannelHoldApisSchema, {
  async handler(
    request,
    context: IDatastoreApiContext,
  ): Promise<IChannelHoldApiTypes['ChannelHold.register']['result']> {
    const manifest = await context.datastoreRegistry.get(request.datastoreId, null, false);
    if (!manifest) throw new Error(`Unknown datastore requested ${request.datastoreId}`);
    await context.micropaymentChannelSpendTracker.importChannelHold(request, manifest);
    return { accepted: true };
  },
});
