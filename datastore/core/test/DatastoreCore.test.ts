import { mkdirSync, promises as Fs, rmSync } from 'fs';
import * as Path from 'path';
import Packager from '@ulixee/datastore-packager';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import DbxFile from '@ulixee/datastore-packager/lib/DbxFile';
import { IDatastoreApiTypes } from '@ulixee/specification/datastore';
import Identity from '@ulixee/crypto/lib/Identity';
import SidechainClient from '@ulixee/sidechain';
import DatastoreRegistry from '../lib/DatastoreRegistry';
import DatastoreCore from '../index';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'DatastoreCore.test');
const tmpDir = `${storageDir}/tmp`;
let packager: Packager;
let dbx: DbxFile;

beforeAll(async () => {
  mkdirSync(storageDir, { recursive: true });
  DatastoreCore.options.datastoresTmpDir = tmpDir;
  DatastoreCore.options.datastoresDir = storageDir;
  DatastoreCore.options.identityWithSidechain = Identity.createSync();
  await DatastoreCore.start();
  packager = new Packager(require.resolve('./datastores/bootup.ts'));
  dbx = await packager.build();
}, 30e3);

afterAll(async () => {
  await DatastoreCore.close();
  try {
    rmSync(storageDir, { recursive: true });
  } catch (err) {}
});

test('should install new datastores on startup', async () => {
  await Fs.copyFile(dbx.dbxPath, `${storageDir}/bootup.dbx`);
  await DatastoreCore.installManuallyUploadedDbxFiles();
  const registry = new DatastoreRegistry(storageDir, tmpDir);
  expect(registry.hasVersionHash(packager.manifest.versionHash)).toBe(true);
  // @ts-ignore
  const dbxPath = registry.getDbxPath(packager.manifest);
  await expect(existsAsync(dbxPath)).resolves.toBeTruthy();
}, 45e3);

test('can load a version from disk if not already open', async () => {
  await expect(
    runApi('Datastore.upload', {
      compressedDatastore: await Fs.readFile(dbx.dbxPath),
      allowNewLinkedVersionHistory: false,
    }),
  ).resolves.toEqual({ success: true });

  const registry = new DatastoreRegistry(storageDir, tmpDir);
  // @ts-ignore
  await Fs.rm(registry.getDatastoreWorkingDirectory(packager.manifest.versionHash), {
    recursive: true,
  });

  await runApi('Datastore.query', {
    sql: 'SELECT * FROM bootup()',
    versionHash: packager.manifest.versionHash,
  });

  await expect(
    runApi('Datastore.query', {
      sql: 'SELECT * FROM bootup()',
      versionHash: packager.manifest.versionHash,
    }),
  ).resolves.toMatchObject({
    outputs: [{ success: true }],
    latestVersionHash: packager.manifest.versionHash,
  });
});

test('can get metadata about an uploaded datastore', async () => {
  jest.spyOn(SidechainClient.prototype, 'getSettings').mockImplementationOnce(() => {
    return Promise.resolve({
      settlementFeeMicrogons: 10,
    } as any);
  });
  await expect(
    runApi('Datastore.upload', {
      compressedDatastore: await Fs.readFile(dbx.dbxPath),
      allowNewLinkedVersionHistory: false,
    }),
  ).resolves.toEqual({ success: true });
  await expect(
    runApi('Datastore.meta', { versionHash: packager.manifest.versionHash }),
  ).resolves.toEqual(<IDatastoreApiTypes['Datastore.meta']['result']>{
    latestVersionHash: packager.manifest.versionHash,
    giftCardIssuerIdentities: [],
    computePricePerQuery: 0,
    functionsByName: {
      bootup: {
        stats: {
          averageBytesPerQuery: expect.any(Number),
          averageMilliseconds: expect.any(Number),
          averageTotalPricePerQuery: 0,
          maxBytesPerQuery: expect.any(Number),
          maxPricePerQuery: 0,
          maxMilliseconds: expect.any(Number),
        },
        pricePerQuery: 0,
        minimumPrice: 0,
        priceBreakdown: [
          {
            perQuery: 0,
            minimum: 0,
            addOns: { perKb: 0 },
          },
        ],
      },
    },
    schemaInterface: `{
  bootup: {
    output: {
      "is-valid"?: boolean;
      success: boolean;
    };
  };
}`,
  });
});

function runApi<API extends keyof IDatastoreApiTypes & string>(
  Api: API,
  args: IDatastoreApiTypes[API]['args'],
): Promise<IDatastoreApiTypes[API]['result']> {
  // @ts-expect-error
  const context = DatastoreCore.getApiContext();
  // @ts-expect-error
  return DatastoreCore.apiRegistry.handlersByCommand[Api](args, context);
}
