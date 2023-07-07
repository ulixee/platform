import { CloudNode } from '@ulixee/cloud';
import Packager from '@ulixee/datastore-packager';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { mkdirSync, rmSync } from 'fs';
import * as Path from 'path';
import moment = require('moment');
import { Helpers } from '@ulixee/datastore-testing';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'DatastoreVm.test');
const tmpDir = `${storageDir}/tmp`;
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
  Helpers.onClose(()=>client.disconnect(), true);
}, 30e3);

afterEach(Helpers.afterEach);
afterAll(Helpers.afterAll);

test('can run a Datastore with momentjs', async () => {
  const packager = new Packager(require.resolve('./datastores/moment.ts'));
  const dbx = await packager.build();
  await dbx.upload(await cloudNode.address);
  await expect(
    client.stream(packager.manifest.id, packager.manifest.version, 'moment', {
      date: '2021/02/01',
    }),
  ).rejects.toThrow('input did not match its Schema');

  await expect(
    client.stream(packager.manifest.id, packager.manifest.version, 'moment', {
      date: '2021-02-01',
    }),
  ).resolves.toEqual([{ date: moment('2021-02-01').toDate() }]);
}, 45e3);

test('can get the stack trace of a compiled datastore', async () => {
  const packager = new Packager(require.resolve('./datastores/errorStackDatastore.ts'));
  const dbx = await packager.build();
  await dbx.upload(await cloudNode.address);
  const expectedPath = Path.join(
    `${packager.manifest.id}@${packager.manifest.version}.dbx`,
    'datastore',
    'core',
    'test',
    'datastores',
    'errorStack.ts',
  );
  try {
    await client.stream(packager.manifest.id, packager.manifest.version, 'errorStack', {});
  } catch (error) {
    expect(error.stack).toContain(`at multiply (${expectedPath}:15:25)`);
  }
}, 45e3);
