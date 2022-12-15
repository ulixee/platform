import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import { promises as Fs } from 'fs';
import Identity from '@ulixee/crypto/lib/Identity';
import { InvalidSignatureError } from '@ulixee/crypto/lib/errors';
import DataboxApiClient from '@ulixee/databox/lib/DataboxApiClient';
import DataboxApiHandler from '../lib/DataboxApiHandler';
import { unpackDbx } from '../lib/dbxUtils';
import DataboxCore from '../index';
import { InvalidPermissionsError } from '../lib/errors';

export default new DataboxApiHandler('Databox.upload', {
  async handler(request, context): Promise<{ success: boolean }> {
    if (DataboxCore.isClosing)
      throw new CanceledPromiseError('Miner shutting down. Not accepting uploads.');

    await DataboxCore.start();

    const { workTracker, databoxRegistry, configuration } = context;
    const { compressedDatabox, allowNewLinkedVersionHistory, uploaderIdentity, uploaderSignature } =
      request;

    if (configuration.uploaderIdentities.length) {
      if (!uploaderIdentity || !configuration.uploaderIdentities.includes(uploaderIdentity)) {
        throw new InvalidPermissionsError(
          `Your Identity is not approved to upload Databoxes to this Miner (${
            uploaderIdentity ?? 'none provided'
          }).`,
        );
      }
      const message = DataboxApiClient.createUploadSignatureMessage(
        compressedDatabox,
        allowNewLinkedVersionHistory,
      );
      if (!Identity.verify(uploaderIdentity, message, uploaderSignature)) {
        throw new InvalidSignatureError(
          'This uploaded Databox did not have a valid Identity signature.',
        );
      }
    }

    return await workTracker.trackUpload(
      (async () => {
        const tmpDir = await Fs.mkdtemp(`${configuration.databoxesTmpDir}/`);
        try {
          await unpackDbx(compressedDatabox, tmpDir);
          await databoxRegistry.save(tmpDir, compressedDatabox, allowNewLinkedVersionHistory);
        } finally {
          // remove tmp dir in case of errors
          await Fs.rm(tmpDir, { recursive: true }).catch(() => null);
        }
        return { success: true };
      })(),
    );
  },
});
