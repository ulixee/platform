import { mkdirSync, promises as Fs, rmdirSync } from 'fs';
import * as Path from 'path';
import Packager from '@ulixee/databox-packager';
import DataboxCoreRuntime from '@ulixee/databox-core-runtime';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import DbxFile from '@ulixee/databox-packager/lib/DbxFile';
import { IDataboxApiTypes } from '@ulixee/specification/databox';
import DataboxRegistry from '../lib/DataboxRegistry';
import DataboxCore from '../index';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'databox.core.test');
const tmpDir = `${storageDir}/tmp`;
let packager: Packager;
let dbx: DbxFile;

beforeAll(async () => {
  mkdirSync(storageDir, { recursive: true });
  DataboxCore.options.databoxesTmpDir = tmpDir;
  DataboxCore.options.databoxesDir = storageDir;
  await DataboxCore.start();
  await DataboxCore.registerRuntime(new DataboxCoreRuntime());
  packager = new Packager(require.resolve('./databoxes/bootup.ts'));
  dbx = await packager.build();
});

afterAll(() => {
  rmdirSync(storageDir, { recursive: true });
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
  await Fs.rmdir(registry.getDataboxWorkingDirectory(packager.manifest.versionHash), {
    recursive: true,
  });

  await expect(runApi('Databox.run', packager.manifest)).resolves.toMatchObject({
    output: { success: true },
    latestVersionHash: packager.manifest.versionHash,
  });
});

test('can get metadata about an uploaded databox', async () => {
  await expect(
    runApi('Databox.upload', {
      compressedDatabox: await Fs.readFile(dbx.dbxPath),
      allowNewLinkedVersionHistory: false,
    }),
  ).resolves.toEqual({ success: true });
  await expect(
    runApi('Databox.meta', { versionHash: packager.manifest.versionHash }),
  ).resolves.toEqual({
    latestVersionHash: packager.manifest.versionHash,
    giftCardPaymentAddresses: [],
    averageBytesPerQuery: expect.any(Number),
    averageMilliseconds: expect.any(Number),
    averageTotalPricePerQuery: 0,
    basePricePerQuery: 0,
    computePricePerKb: 0,
    maxBytesPerQuery: expect.any(Number),
    maxPricePerQuery: 0,
    maxMilliseconds: expect.any(Number),
    schema: null,
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
