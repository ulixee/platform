import { CloudNode } from '@ulixee/cloud';
import { copyDir, existsAsync } from '@ulixee/commons/lib/fileUtils';
import Packager from '@ulixee/datastore-packager';
import Dbx from '@ulixee/datastore-packager/lib/Dbx';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { mkdirSync, rmSync } from 'fs';
import * as Hostile from 'hostile';
import * as Path from 'path';
import DatastoreRegistry from '../lib/DatastoreRegistry';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'DatastoreRegistryService.test');
const tmpDir = `${storageDir}/tmp`;
let bootupPackager: Packager;
let bootupDbx: Dbx;
let cloudNode: CloudNode;
let client: DatastoreApiClient;

beforeAll(async () => {
  mkdirSync(storageDir, { recursive: true });
  cloudNode = new CloudNode();
  cloudNode.router.datastoreConfiguration = {
    datastoresDir: storageDir,
    datastoresTmpDir: Path.join(storageDir, 'tmp'),
  };
  await cloudNode.listen();
  client = new DatastoreApiClient(await cloudNode.address);
  bootupPackager = new Packager(require.resolve('./datastores/bootup.ts'));
  bootupDbx = await bootupPackager.build();
  if (process.env.CI !== 'true') Hostile.set('127.0.0.1', 'bootup-datastore.com');
}, 60e3);

afterAll(async () => {
  await cloudNode.close();
  await client.disconnect();
  if (process.env.CI !== 'true') Hostile.remove('127.0.0.1', 'bootup-datastore.com');
  try {
    rmSync(storageDir, { recursive: true });
  } catch (err) {}
});

test('should install new datastores on startup', async () => {
  await copyDir(bootupDbx.path, `${storageDir}/bootup.dbx`);
  const registry = new DatastoreRegistry(storageDir);
  await registry.diskStore.installManualUploads([], '127.0.0.1:1818');
  // @ts-expect-error
  const entry = registry.diskStore.datastoresDb.versions.getByHash(
    bootupPackager.manifest.versionHash,
  );
  expect(entry).toBeTruthy();

  await expect(existsAsync(entry.dbxPath)).resolves.toBeTruthy();
}, 45e3);

test.todo('should proxy datastore uploads to the registry owner');
test.todo('should look for datastores in the hosted service');
test.todo('should download source code from the hosted service');
test.todo('should look in the peer network for a datastore');
test.todo('should expire datastores');
test.todo('should re-download expired datastores if not available');
