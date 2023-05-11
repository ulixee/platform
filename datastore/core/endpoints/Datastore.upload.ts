import { promises as Fs } from 'fs';
import Identity from '@ulixee/crypto/lib/Identity';
import { InvalidSignatureError } from '@ulixee/crypto/lib/errors';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import { unpackDbx } from '../lib/dbxUtils';

export default new DatastoreApiHandler('Datastore.upload', {
  async handler(request, context): Promise<{ success: boolean }> {
    const { workTracker, datastoreRegistry, configuration } = context;
    const { compressedDatastore, allowNewLinkedVersionHistory, adminIdentity, adminSignature } =
      request;
    const { datastoresTmpDir, cloudAdminIdentities, datastoresMustHaveOwnAdminIdentity } =
      configuration;

    if (
      configuration.cloudAdminIdentities.length ||
      configuration.serverEnvironment === 'production'
    ) {
      verifyAdminSignature(request);
    }

    // if there's a cluster storage engine, we need to delegate this call there
    if (!context.datastoreRegistry.diskStore.isSourceOfTruth) {
      const storageEngineHost = context.datastoreApiClients.get(
        context.datastoreRegistry.sourceOfTruthAddress.host,
      );
      return await storageEngineHost.request('Datastore.upload', request);
    }

    // TODO: do we require payment for hosting per day?

    return await workTracker.trackUpload(
      (async () => {
        let success: boolean;
        const tmpDir = await Fs.mkdtemp(`${datastoresTmpDir}/`);
        try {
          await unpackDbx(compressedDatastore, tmpDir);
          const { didInstall } = await datastoreRegistry.save(
            tmpDir,
            {
              adminIdentity,
              allowNewLinkedVersionHistory,
              hasServerAdminIdentity: cloudAdminIdentities.includes(adminIdentity ?? '-1'),
              datastoresMustHaveOwnAdminIdentity,
            },
            {
              host: context.connectionToClient?.transport.remoteId,
              source: 'upload',
              adminIdentity,
              adminSignature,
            },
          );
          success = didInstall;
        } finally {
          // remove tmp dir in case of errors
          await Fs.rm(tmpDir, { recursive: true }).catch(() => null);
        }
        return { success };
      })(),
    );
  },
});

function verifyAdminSignature(request: IDatastoreApiTypes['Datastore.upload']['args']): void {
  const message = DatastoreApiClient.createUploadSignatureMessage(
    request.compressedDatastore,
    request.allowNewLinkedVersionHistory,
  );
  if (!Identity.verify(request.adminIdentity, message, request.adminSignature)) {
    throw new InvalidSignatureError(
      'This uploaded Datastore did not have a valid AdminIdentity signature.',
    );
  }
}
