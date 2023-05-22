import Identity from '@ulixee/crypto/lib/Identity';
import { InvalidSignatureError } from '@ulixee/crypto/lib/errors';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import { InvalidPermissionsError } from '../lib/errors';
import IDatastoreApiContext from '../interfaces/IDatastoreApiContext';

export default new DatastoreApiHandler('Datastore.download', {
  async handler(request, context): Promise<IDatastoreApiTypes['Datastore.download']['result']> {
    const { datastoreRegistry, configuration } = context;
    const { versionHash, requestDate } = request;

    if (Date.now() - requestDate.getTime() > 10e3) {
      throw new Error('This download request date is too old. Please try again.');
    }

    if (configuration.cloudType === 'private') {
      await verifyAdminIdentity(request, context);
    } else {
      // TODO: add real payment processing
    }

    // don't go out to the network
    return await datastoreRegistry.diskStore.getCompressedDbx(versionHash);
  },
});

async function verifyAdminIdentity(
  request: IDatastoreApiTypes['Datastore.download']['args'],
  context: IDatastoreApiContext,
): Promise<void> {
  const { datastoreRegistry, configuration } = context;
  const { versionHash, requestDate, adminIdentity, adminSignature } = request;
  if (!adminIdentity && configuration.serverEnvironment === 'production') {
    throw new InvalidPermissionsError(`Download from this cloud require Admin Signatures.`);
  }

  let isValidAdmin = configuration.cloudAdminIdentities.includes(adminIdentity);
  if (!isValidAdmin) {
    const datastore = await datastoreRegistry.getByVersionHash(versionHash);
    isValidAdmin = datastore.adminIdentities.includes(adminIdentity);
  }

  if (!isValidAdmin)
    throw new InvalidPermissionsError(
      `The signing Admin Identity does not have permissions to this Datastore`,
    );

  const signatureMessage = DatastoreApiClient.createDownloadSignatureMessage(
    versionHash,
    requestDate.getTime(),
  );
  if (!Identity.verify(adminIdentity, signatureMessage, adminSignature)) {
    throw new InvalidSignatureError(
      "You didn't include a valid AdminIdentity signature to authorize this request.",
    );
  }
}
