import { mkdirSync, rmSync } from 'fs';
import * as Path from 'path';
import Packager from '@ulixee/datastore-packager';
import { copyDir, existsAsync } from '@ulixee/commons/lib/fileUtils';
import Dbx from '@ulixee/datastore-packager/lib/Dbx';
import SidechainClient from '@ulixee/sidechain';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import * as Hostile from 'hostile';
import { CloudNode } from '@ulixee/cloud';
import DatastoreRegistry from '../lib/DatastoreRegistry';
import DatastoreCore from '../index';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'DatastoreCore.test');
const tmpDir = `${storageDir}/tmp`;
let bootupPackager: Packager;
let bootupDbx: Dbx;
let cloudNode: CloudNode;
let client: DatastoreApiClient;

beforeAll(async () => {
  mkdirSync(storageDir, { recursive: true });
  DatastoreCore.options.datastoresTmpDir = tmpDir;
  DatastoreCore.options.datastoresDir = storageDir;
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

test('should be able to lookup a datastore domain', async () => {
  await client.upload(await bootupDbx.tarGzip(), {
    allowNewLinkedVersionHistory: false,
  });

  await expect(
    DatastoreApiClient.resolveDatastoreDomain(`bootup-datastore.com:${await cloudNode.port}`),
  ).resolves.toEqual({
    host: await cloudNode.address,
    datastoreVersionHash: bootupPackager.manifest.versionHash,
  });
}, 45e3);

test('can get metadata about an uploaded datastore', async () => {
  jest.spyOn(SidechainClient.prototype, 'getSettings').mockImplementationOnce(() => {
    return Promise.resolve({
      settlementFeeMicrogons: 10,
    } as any);
  });
  await client.upload(await bootupDbx.tarGzip(), {
    allowNewLinkedVersionHistory: false,
  });

  const meta = await client.getMeta(bootupPackager.manifest.versionHash);
  expect(meta.versionHash).toBe(bootupPackager.manifest.versionHash);
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
