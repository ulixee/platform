import { readFileAsJson } from '@ulixee/commons/lib/fileUtils';
import { InvalidSignatureError } from '@ulixee/crypto/lib/errors';
import Identity from '@ulixee/crypto/lib/Identity';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import IDatastoreApiTypes from '@ulixee/platform-specification/datastore/DatastoreApis';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import { promises as Fs } from 'fs';
import IDatastoreApiContext from '../interfaces/IDatastoreApiContext';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import { IDatastoreSourceDetails } from '../lib/DatastoreRegistryDiskStore';
import { unpackDbx } from '../lib/dbxUtils';

export default new DatastoreApiHandler('Datastore.createStorageEngine', {
  async handler(request, context) {
    const { configuration } = context;
    const { version, previousVersion } = request;

    const needsValidSignatures = configuration.serverEnvironment === 'production';
    if (needsValidSignatures) {
      verifySignature(
        version.compressedDbx,
        version.adminIdentity,
        version.adminSignature,
        'uploaded "version"',
      );
      if (previousVersion)
        verifySignature(
          previousVersion.compressedDbx,
          previousVersion.adminIdentity,
          previousVersion.adminSignature,
          'uploaded "previousVersion"',
        );
    }

    if (previousVersion) await install(previousVersion, context, false);

    await install(version, context, true);

    return { success: true };
  },
});

async function install(
  version: IDatastoreApiTypes['Datastore.upload']['args'],
  context: IDatastoreApiContext,
  forceInstall = false,
): Promise<void> {
  const { configuration, datastoreRegistry, storageEngineRegistry } = context;
  const tmpVersionDir = await Fs.mkdtemp(`${configuration.datastoresTmpDir}/`);
  try {
    await unpackDbx(version.compressedDbx, tmpVersionDir);
    const manifest = await readFileAsJson<IDatastoreManifest>(
      `${tmpVersionDir}/datastore-manifest.json`,
    );
    if (!storageEngineRegistry.isHostingStorageEngine(manifest.storageEngineHost)) {
      throw new Error(
        `Uploaded to invalid Datastore.createStorageEngine host. Should have been ${manifest.storageEngineHost}.`,
      );
    }

    const { adminIdentity, adminSignature } = version;
    // install will trigger storage engine installation
    const sourceDetails: IDatastoreSourceDetails = {
      source: 'upload:create-storage',
      adminIdentity,
      adminSignature,
    };
    const result = await datastoreRegistry.diskStore.install(
      tmpVersionDir,
      {
        adminIdentity,
        hasServerAdminIdentity: configuration.cloudAdminIdentities.includes(adminIdentity ?? '-1'),
      },
      sourceDetails,
    );
    if (forceInstall && !result.didInstall) {
      await datastoreRegistry.diskStore.onInstalled(result.manifest, sourceDetails);
    }
  } finally {
    // remove tmp dir in case of errors
    await Fs.rm(tmpVersionDir, { recursive: true }).catch(() => null);
  }
}

function verifySignature(
  compressedDbx: Buffer,
  adminIdentity: string,
  adminSignature: Buffer,
  name: string,
): void {
  const message = DatastoreApiClient.createUploadSignatureMessage(compressedDbx);
  if (!Identity.verify(adminIdentity, message, adminSignature)) {
    throw new InvalidSignatureError(
      `This ${name} Datastore did not have a valid AdminIdentity signature.`,
    );
  }
}
