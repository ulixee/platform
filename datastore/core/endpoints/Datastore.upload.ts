import Identity from '@ulixee/crypto/lib/Identity';
import { InvalidSignatureError } from '@ulixee/crypto/lib/errors';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import IDatastoreCoreConfigureOptions from '../interfaces/IDatastoreCoreConfigureOptions';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';

export default new DatastoreApiHandler('Datastore.upload', {
  async handler(request, context): Promise<{ success: boolean }> {
    const { workTracker, datastoreRegistry, configuration } = context;

    verifyAdminSignature(request, configuration);

    // Check if this DatastoreRegistry should be the "owner" of this datastore. If not, proxy it through.
    if (!context.datastoreRegistry.diskStore.isSourceOfTruth) {
      return await context.datastoreRegistry.uploadToSourceOfTruth(request);
    }

    // TODO: do we require payment for hosting per day?

    return await workTracker.trackUpload(
      datastoreRegistry.saveDbx(request, context.connectionToClient?.transport.remoteId),
    );
  },
});

export function verifyAdminSignature(
  request: IDatastoreApiTypes['Datastore.upload']['args'],
  configuration: IDatastoreCoreConfigureOptions,
): void {
  if (
    configuration.cloudAdminIdentities.length ||
    configuration.serverEnvironment === 'production'
  ) {
    const message = DatastoreApiClient.createUploadSignatureMessage(
      request.compressedDbx,
      request.allowNewLinkedVersionHistory,
    );
    if (!Identity.verify(request.adminIdentity, message, request.adminSignature)) {
      throw new InvalidSignatureError(
        'This uploaded Datastore did not have a valid AdminIdentity signature.',
      );
    }
  }
}
