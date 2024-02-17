import { InvalidSignatureError } from '@ulixee/platform-utils/lib/errors';
import Identity from '@ulixee/platform-utils/lib/Identity';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import { DatastoreNotFoundError, InvalidPermissionsError } from '../lib/errors';

export default new DatastoreApiHandler('Datastore.download', {
  async handler(request, context): Promise<IDatastoreApiTypes['Datastore.download']['result']> {
    const { datastoreRegistry, configuration } = context;
    const { id, version, requestDate, adminIdentity, adminSignature } = request;

    if (Date.now() - requestDate.getTime() > 10e3) {
      throw new Error('This download request date is too old. Please try again.');
    }

    // verify admin permissions to download
    let isValidAdmin = configuration.cloudAdminIdentities.includes(adminIdentity);
    if (!isValidAdmin) {
      if (!adminIdentity && configuration.serverEnvironment === 'production') {
        throw new InvalidPermissionsError(`Download from this cloud require Admin Signatures.`);
      }

      const datastore = await datastoreRegistry.get(id, version);
      isValidAdmin = datastore.adminIdentities.includes(adminIdentity);
    }

    if (!isValidAdmin)
      throw new InvalidPermissionsError(
        `The signing Admin Identity does not have permissions to this Datastore`,
      );

    const signatureMessage = DatastoreApiClient.createDownloadSignatureMessage(
      id,
      version,
      requestDate.getTime(),
    );
    if (!Identity.verify(adminIdentity, signatureMessage, adminSignature)) {
      throw new InvalidSignatureError(
        "You didn't include a valid AdminIdentity signature to authorize this request.",
      );
    }

    // don't go out to the network
    const result = await datastoreRegistry.diskStore.getCompressedDbx(id, version);
    if (!result)
      throw new DatastoreNotFoundError('Could not find this Datastore runtime.', { version });
    return result;
  },
});
