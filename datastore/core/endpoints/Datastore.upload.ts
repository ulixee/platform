import { UlixeeError } from '@ulixee/commons/lib/errors';
import Identity from '@ulixee/platform-utils/lib/Identity';
import { InvalidSignatureError } from '@ulixee/platform-utils/lib/errors';
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

    const result = await workTracker.trackUpload(
      datastoreRegistry.saveDbx(request, context.connectionToClient?.transport.remoteId),
    );
    if (result.manifest && !result.didInstall) {
      throw new UlixeeError(
        'This datastore version has already been uploaded',
        'ERR_DUPLICATE_VERSION',
        {
          version: result.manifest.version,
        },
      );
    }
    return { success: result?.didInstall ?? false };
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
    const message = DatastoreApiClient.createUploadSignatureMessage(request.compressedDbx);
    if (!Identity.verify(request.adminIdentity, message, request.adminSignature)) {
      throw new InvalidSignatureError(
        'This uploaded Datastore did not have a valid AdminIdentity signature.',
      );
    }
  }
}
