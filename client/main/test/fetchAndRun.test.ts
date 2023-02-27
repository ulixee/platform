import * as Fs from 'fs';
import * as Path from 'path';
import { CloudNode } from '@ulixee/cloud';
import DatastorePackager from '@ulixee/datastore-packager';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import Client from '..';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Client.fetch.test');
let cloudNode: CloudNode;
let apiClient: DatastoreApiClient;

beforeAll(async () => {
  cloudNode = new CloudNode();
  cloudNode.router.datastoreConfiguration = {
    datastoresDir: storageDir,
    datastoresTmpDir: Path.join(storageDir, 'tmp'),
  };
  await cloudNode.listen();
  apiClient = new DatastoreApiClient(await cloudNode.address);
});

afterAll(async () => {
  await cloudNode.close();
  if (Fs.existsSync(storageDir)) Fs.rmSync(storageDir, { recursive: true });
});

test('should be able to fetch a datastore table', async () => {
  const packager = new DatastorePackager(`${__dirname}/datastores/fetch.js`);
  await packager.build();
  await apiClient.upload(await packager.dbx.asBuffer());
  const cloudNodeAddress = await cloudNode.address;
  const client = new Client(`ulx://${cloudNodeAddress}/${packager.manifest.versionHash}`);
  const results = await client.fetch('testers');

  expect(results).toEqual([
    { firstName: 'Caleb', lastName: 'Clark', isTester: true },
    { firstName: 'Blake', lastName: 'Byrnes', isTester: null },
  ]);
});

test('should be able to run a datastore runner', async () => {
  const packager = new DatastorePackager(`${__dirname}/datastores/fetch.js`);
  await packager.build();
  await apiClient.upload(await packager.dbx.asBuffer());
  const cloudNodeAddress = await cloudNode.address;
  const client = new Client(`ulx://${cloudNodeAddress}/${packager.manifest.versionHash}`);
  const results = await client.run('test', { shouldTest: true });

  expect(results).toEqual([{ testerEcho: true, greeting: 'Hello world' }]);
});
