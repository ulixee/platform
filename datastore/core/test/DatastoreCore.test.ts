import { CloudNode } from '@ulixee/cloud';
import { copyDir, existsAsync } from '@ulixee/commons/lib/fileUtils';
import Packager from '@ulixee/datastore-packager';
import Dbx from '@ulixee/datastore-packager/lib/Dbx';
import { Helpers } from '@ulixee/datastore-testing';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import * as Path from 'path';
import DatastoreRegistry from '../lib/DatastoreRegistry';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'DatastoreCore.test');
let bootupPackager: Packager;
let bootupDbx: Dbx;
let cloudNode: CloudNode;
let client: DatastoreApiClient;

beforeAll(async () => {
  cloudNode = await Helpers.createLocalNode(
    {
      datastoreConfiguration: {
        datastoresDir: storageDir,
        datastoresTmpDir: Path.join(storageDir, 'tmp'),
      },
    },
    true,
  );
  client = new DatastoreApiClient(await cloudNode.address);
  Helpers.onClose(() => client.disconnect(), true);
  bootupPackager = new Packager(require.resolve('./datastores/bootup.ts'));
  bootupDbx = await bootupPackager.build();
}, 60e3);

afterAll(Helpers.afterAll);
afterEach(Helpers.afterEach);

test('should install new datastores on startup', async () => {
  await copyDir(bootupDbx.path, `${storageDir}/bootup.dbx`);
  const registry = new DatastoreRegistry(storageDir);
  await registry.diskStore.installOnDiskUploads([]);
  // @ts-expect-error
  const entry = registry.diskStore.datastoresDb.versions.get(
    bootupPackager.manifest.id,
    bootupPackager.manifest.version,
  );
  expect(entry).toBeTruthy();

  await expect(existsAsync(entry.dbxPath)).resolves.toBeTruthy();
}, 45e3);

test('can get metadata about an uploaded datastore', async () => {
  await client.upload(await bootupDbx.tarGzip()).catch(() => null);

  const meta = await client.getMeta(bootupPackager.manifest.id, bootupPackager.manifest.version);
  expect(meta.version).toBe(bootupPackager.manifest.version);
  expect(meta.scriptEntrypoint).toBe(bootupPackager.manifest.scriptEntrypoint);
  expect(meta.stats).toBeTruthy();
  expect(meta.extractorsByName.bootup).toBeTruthy();
  expect(meta.schemaInterface).toBe(`{
  tables: {};
  extractors: {
    bootup: {
      output: {
        "is-valid"?: boolean;
        success: boolean;
      };
    };
  };
  crawlers: {};
}`);
});
