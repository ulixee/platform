import { mkdirSync, promises as Fs, rmdirSync } from 'fs';
import * as Path from 'path';
import Packager from '@ulixee/databox-packager';
import DataboxCoreRuntime from '@ulixee/databox-core-runtime';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import PackageRegistry from '../lib/PackageRegistry';
import DataboxCore from '../index';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'databox.core.test');
const tmpDir = `${storageDir}/tmp`;

DataboxCore.databoxesUnpackDir = tmpDir;
DataboxCore.databoxesDir = storageDir;

beforeAll(async () => {
  mkdirSync(storageDir, { recursive: true });
  await DataboxCore.start();
  await DataboxCore.registerRuntime(new DataboxCoreRuntime());
});

afterAll(() => {
  rmdirSync(storageDir, { recursive: true });
});

test('should install new databoxes on startup', async () => {
  const packager = new Packager(require.resolve('./databoxes/bootup.ts'));
  const dbx = await packager.build();
  await Fs.copyFile(dbx.dbxPath, `${storageDir}/bootup.dbx`);
  await DataboxCore.installManuallyUploadedDbxFiles();
  const registry = new PackageRegistry(storageDir, tmpDir);
  expect(registry.hasVersionHash(packager.manifest.versionHash)).toBe(true);
  // @ts-ignore
  const dbxPath = registry.getDbxPath(packager.manifest);
  await expect(existsAsync(dbxPath)).resolves.toBeTruthy();
});

test('can load a version from disk if not already open', async () => {
  const packager = new Packager(require.resolve('./databoxes/bootup.ts'));
  const dbx = await packager.build();
  await expect(DataboxCore.upload(await Fs.readFile(dbx.dbxPath), false)).resolves.toBeUndefined();

  const registry = new PackageRegistry(storageDir, tmpDir);
  // @ts-ignore
  await Fs.rmdir(registry.getDataboxWorkingDirectory(packager.manifest.versionHash), {
    recursive: true,
  });

  await expect(DataboxCore.run(packager.manifest.versionHash)).resolves.toMatchObject({
    output: { success: true },
    latestVersionHash: packager.manifest.versionHash,
  });
});
