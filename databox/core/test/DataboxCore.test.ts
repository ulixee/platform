import { mkdirSync, promises as Fs, rmSync } from 'fs';
import * as Path from 'path';
import Packager from '@ulixee/databox-packager';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import DbxFile from '@ulixee/databox-packager/lib/DbxFile';
import { IDataboxApiTypes } from '@ulixee/specification/databox';
import Identity from '@ulixee/crypto/lib/Identity';
import SidechainClient from '@ulixee/sidechain';
import DataboxRegistry from '../lib/DataboxRegistry';
import DataboxCore from '../index';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'DataboxCore.test');
const tmpDir = `${storageDir}/tmp`;
let packager: Packager;
let dbx: DbxFile;

beforeAll(async () => {
  mkdirSync(storageDir, { recursive: true });
  DataboxCore.options.databoxesTmpDir = tmpDir;
  DataboxCore.options.databoxesDir = storageDir;
  DataboxCore.options.identityWithSidechain = Identity.createSync();
  await DataboxCore.start();
  packager = new Packager(require.resolve('./databoxes/bootup.ts'));
  dbx = await packager.build();
}, 30e3);

afterAll(async () => {
  await DataboxCore.close();
  try {
    rmSync(storageDir, { recursive: true });
  } catch (err) {}
});

test('should install new databoxes on startup', async () => {
  await Fs.copyFile(dbx.dbxPath, `${storageDir}/bootup.dbx`);
  await DataboxCore.installManuallyUploadedDbxFiles();
  const registry = new DataboxRegistry(storageDir, tmpDir);
  expect(registry.hasVersionHash(packager.manifest.versionHash)).toBe(true);
  // @ts-ignore
  const dbxPath = registry.getDbxPath(packager.manifest);
  await expect(existsAsync(dbxPath)).resolves.toBeTruthy();
}, 45e3);

test('can load a version from disk if not already open', async () => {
  await expect(
    runApi('Databox.upload', {
      compressedDatabox: await Fs.readFile(dbx.dbxPath),
      allowNewLinkedVersionHistory: false,
    }),
  ).resolves.toEqual({ success: true });

  const registry = new DataboxRegistry(storageDir, tmpDir);
  // @ts-ignore
  await Fs.rm(registry.getDataboxWorkingDirectory(packager.manifest.versionHash), {
    recursive: true,
  });

  await runApi('Databox.query', {
    sql: 'SELECT * FROM bootup()',
    versionHash: packager.manifest.versionHash,
  });

  await expect(
    runApi('Databox.query', {
      sql: 'SELECT * FROM bootup()',
      versionHash: packager.manifest.versionHash,
    }),
  ).resolves.toMatchObject({
    outputs: [{ success: true }],
    latestVersionHash: packager.manifest.versionHash,
  });
});

test('can get metadata about an uploaded databox', async () => {
  jest.spyOn(SidechainClient.prototype, 'getSettings').mockImplementationOnce(() => {
    return Promise.resolve({
      settlementFeeMicrogons: 10,
    } as any);
  });
  await expect(
    runApi('Databox.upload', {
      compressedDatabox: await Fs.readFile(dbx.dbxPath),
      allowNewLinkedVersionHistory: false,
    }),
  ).resolves.toEqual({ success: true });
  await expect(
    runApi('Databox.meta', { versionHash: packager.manifest.versionHash }),
  ).resolves.toEqual(<IDataboxApiTypes['Databox.meta']['result']>{
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

function runApi<API extends keyof IDataboxApiTypes & string>(
  Api: API,
  args: IDataboxApiTypes[API]['args'],
): Promise<IDataboxApiTypes[API]['result']> {
  // @ts-expect-error
  const context = DataboxCore.getApiContext();
  // @ts-expect-error
  return DataboxCore.apiRegistry.handlersByCommand[Api](args, context);
}
