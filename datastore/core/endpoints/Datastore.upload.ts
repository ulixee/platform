import { promises as Fs } from 'fs';
import Identity from '@ulixee/crypto/lib/Identity';
import { InvalidSignatureError } from '@ulixee/crypto/lib/errors';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import { unpackDbx } from '../lib/dbxUtils';

export default new DatastoreApiHandler('Datastore.upload', {
  async handler(request, context): Promise<{ success: boolean }> {
    const { workTracker, datastoreRegistry, storageEngineRegistry, configuration, cluster, vm } =
      context;
    const { compressedDatastore, allowNewLinkedVersionHistory, adminIdentity, adminSignature } =
      request;

    // if there's a cluster storage engine, we need to delegate this call there
    if (cluster.serviceAddresses?.storageEngine) {
      const storageEngineHost = context.datastoreApiClients.get(
        cluster.serviceAddresses.storageEngine.host,
      );
      return await storageEngineHost.request('Datastore.upload', request);
    }

    let hasServerAdminIdentity = false;
    if (configuration.cloudAdminIdentities.length) {
      if (adminIdentity && configuration.cloudAdminIdentities.includes(adminIdentity)) {
        hasServerAdminIdentity = true;
      }
      const message = DatastoreApiClient.createUploadSignatureMessage(
        compressedDatastore,
        allowNewLinkedVersionHistory,
      );
      if (!Identity.verify(adminIdentity, message, adminSignature)) {
        throw new InvalidSignatureError(
          'This uploaded Datastore did not have a valid AdminIdentity signature.',
        );
      }
    }

    return await workTracker.trackUpload(
      (async () => {
        const tmpDir = await Fs.mkdtemp(`${configuration.datastoresTmpDir}/`);
        try {
          await unpackDbx(compressedDatastore, tmpDir);
          const { manifest, dbxPath, didInstall } = await datastoreRegistry.save(
            tmpDir,
            adminIdentity,
            allowNewLinkedVersionHistory,
            hasServerAdminIdentity,
            configuration.requireDatastoreAdminIdentities,
          );
          if (didInstall) {
            const previousVersion = await datastoreRegistry.getPreviousVersion(
              manifest.versionHash,
            );
            await storageEngineRegistry.create(vm, dbxPath, manifest, previousVersion);

            await datastoreRegistry.publishDatastore(manifest.versionHash, 'uploaded');
          }
        } finally {
          // remove tmp dir in case of errors
          await Fs.rm(tmpDir, { recursive: true }).catch(() => null);
        }
        return { success: true };
      })(),
    );
  },
});
