import { CloudNode } from '@ulixee/cloud';
import DatastorePackager from '@ulixee/datastore-packager';
import { Helpers } from '@ulixee/datastore-testing';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import * as Path from 'path';
import Client from '..';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Client.fetch.test');
let cloudNode: CloudNode;
let apiClient: DatastoreApiClient;
let packager: DatastorePackager;

beforeAll(async () => {
  cloudNode = await Helpers.createLocalNode({
    datastoreConfiguration: {
      datastoresDir: storageDir,
    },
  });
  packager = new DatastorePackager(`${__dirname}/datastores/fetch.js`);
  await packager.build({ createTemporaryVersion: true });
  apiClient = new DatastoreApiClient(await cloudNode.address);
  Helpers.onClose(() => apiClient.disconnect(), true);
  await apiClient.upload(await packager.dbx.tarGzip());
});

afterAll(Helpers.afterAll);

test('should be able to fetch a datastore table', async () => {
  const cloudNodeAddress = await cloudNode.address;
  const client = new Client(`ulx://${cloudNodeAddress}/${packager.manifest.id}@v${packager.manifest.version}`);
  const results = await client.fetch('testers');

  expect(results).toEqual([
    { firstName: 'Caleb', lastName: 'Clark', isTester: true },
    { firstName: 'Blake', lastName: 'Byrnes', isTester: null },
  ]);
});

test('should be able to run a datastore extractor', async () => {
  const cloudNodeAddress = await cloudNode.address;
  const client = new Client(`ulx://${cloudNodeAddress}/${packager.manifest.id}@v${packager.manifest.version}`);
  const results = await client.run('test', { shouldTest: true });

  expect(results).toEqual([{ testerEcho: true, greeting: 'Hello world' }]);
});
