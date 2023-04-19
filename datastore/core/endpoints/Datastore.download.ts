import Identity from '@ulixee/crypto/lib/Identity';
import { InvalidSignatureError } from '@ulixee/crypto/lib/errors';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import * as Path from 'path';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import { packDbx } from '../lib/dbxUtils';
import { InvalidPermissionsError } from '../lib/errors';

export default new DatastoreApiHandler('Datastore.download', {
  async handler(request, context): Promise<{ compressedDatastore: Buffer }> {
    const { datastoreRegistry, configuration } = context;
    const { versionHash, requestDate, adminIdentity, adminSignature } = request;

    if (Date.now() - requestDate.getTime() > 10e3) {
      throw new Error('This download request date is too old. Please try again.');
    }

    if (adminIdentity || configuration.serverEnvironment === 'production') {
      let isValidAdmin = configuration.cloudAdminIdentities.includes(adminIdentity);
      if (!isValidAdmin) {
        const datastore = await datastoreRegistry.getByVersionHash(versionHash);
        isValidAdmin = datastore.adminIdentities.includes(adminIdentity);
      }
      if (!isValidAdmin)
        throw new InvalidPermissionsError(
          `The signing Admin Identity does not have permissions to this Datastore`,
        );
    }

    const signatureMessage = DatastoreApiClient.createDownloadSignatureMessage(
      versionHash,
      requestDate.getTime(),
    );
    if (!Identity.verify(adminIdentity, signatureMessage, adminSignature)) {
      throw new InvalidSignatureError(
        "You didn't include a valid AdminIdentity signature to authorize this request.s",
      );
    }

    const datastore = await datastoreRegistry.getByVersionHash(versionHash);

    return {
      compressedDatastore: await packDbx(Path.dirname(datastore.path)),
    };
  },
});
