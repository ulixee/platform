import { mkdirSync, rmSync } from 'fs';
import * as Path from 'path';
import Packager from '@ulixee/datastore-packager';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { CloudNode } from '@ulixee/cloud';
import * as Moment from 'moment';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'DatastoreVm.test');
const tmpDir = `${storageDir}/tmp`;
let cloudNode: CloudNode;
let client: DatastoreApiClient;

beforeAll(async () => {
  mkdirSync(storageDir, { recursive: true });
  cloudNode = new CloudNode();
  cloudNode.router.datastoreConfiguration = { datastoresDir: storageDir, datastoresTmpDir: tmpDir };
  await cloudNode.listen();
  client = new DatastoreApiClient(await cloudNode.address);
}, 30e3);

afterAll(async () => {
  await cloudNode.close();
  await client.disconnect();
  try {
    rmSync(storageDir, { recursive: true });
  } catch (err) {}
});

test('can run a Datastore with momentjs', async () => {
  const packager = new Packager(require.resolve('./datastores/moment.ts'));
  const dbx = await packager.build();
  await dbx.upload(await cloudNode.address);
  await expect(
    client.stream(packager.manifest.versionHash, 'moment', { date: '2021/02/01' }),
  ).rejects.toThrow('input did not match its Schema');

  await expect(
    client.stream(packager.manifest.versionHash, 'moment', { date: '2021-02-01' }),
  ).resolves.toEqual([{ date: Moment('2021-02-01').toDate() }]);
}, 45e3);

test('can get the stack trace of a compiled datastore', async () => {
  const packager = new Packager(require.resolve('./datastores/errorStackDatastore.ts'));
  const dbx = await packager.build();
  await dbx.upload(await cloudNode.address);
  const expectedPath = Path.join(
    `errorStackDatastore@${packager.manifest.versionHash}.dbx`,
    'datastore',
    'core',
    'test',
    'datastores',
    'errorStack.ts',
  );
  try {
    await client.stream(packager.manifest.versionHash, 'errorStack', {});
  } catch (error) {
    expect(error.stack).toContain(`at multiply (${expectedPath}:15:25)`);
  }
}, 45e3);


test('can inject a ScriptInstance to a Vm', async () => {
  const packager = new Packager(require.resolve('./datastores/errorStackDatastore.ts'));
  const dbx = await packager.build();
  await dbx.upload(await cloudNode.address);
  const expectedPath = Path.join(
    `errorStackDatastore@${packager.manifest.versionHash}.dbx`,
    'datastore',
    'core',
    'test',
    'datastores',
    'errorStack.ts',
  );
  try {
    await client.stream(packager.manifest.versionHash, 'errorStack', {});
  } catch (error) {
    expect(error.stack).toContain(`at multiply (${expectedPath}:15:25)`);
  }
}, 45e3);
