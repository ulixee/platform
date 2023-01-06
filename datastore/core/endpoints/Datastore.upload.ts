import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import { promises as Fs } from 'fs';
import Identity from '@ulixee/crypto/lib/Identity';
import { InvalidSignatureError } from '@ulixee/crypto/lib/errors';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import { unpackDbx } from '../lib/dbxUtils';
import DatastoreCore from '../index';
import { InvalidPermissionsError } from '../lib/errors';

export default new DatastoreApiHandler('Datastore.upload', {
  async handler(request, context): Promise<{ success: boolean }> {
    if (DatastoreCore.isClosing)
      throw new CanceledPromiseError('Miner shutting down. Not accepting uploads.');

    await DatastoreCore.start();

    const { workTracker, datastoreRegistry, configuration } = context;
    const { compressedDatastore, allowNewLinkedVersionHistory, uploaderIdentity, uploaderSignature } =
      request;

    if (configuration.uploaderIdentities.length) {
      if (!uploaderIdentity || !configuration.uploaderIdentities.includes(uploaderIdentity)) {
        throw new InvalidPermissionsError(
          `Your Identity is not approved to upload Datastores to this Miner (${
            uploaderIdentity ?? 'none provided'
          }).`,
        );
      }
      const message = DatastoreApiClient.createUploadSignatureMessage(
        compressedDatastore,
        allowNewLinkedVersionHistory,
      );
      if (!Identity.verify(uploaderIdentity, message, uploaderSignature)) {
        throw new InvalidSignatureError(
          'This uploaded Datastore did not have a valid Identity signature.',
        );
      }
    }

    return await workTracker.trackUpload(
      (async () => {
        const tmpDir = await Fs.mkdtemp(`${configuration.datastoresTmpDir}/`);
        try {
          await unpackDbx(compressedDatastore, tmpDir);
          await datastoreRegistry.save(tmpDir, compressedDatastore, allowNewLinkedVersionHistory);
        } finally {
          // remove tmp dir in case of errors
          await Fs.rm(tmpDir, { recursive: true }).catch(() => null);
        }
        return { success: true };
      })(),
    );
  },
});
