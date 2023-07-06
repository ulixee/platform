import * as Fs from 'fs';
import * as Path from 'path';
import { CloudNode } from '@ulixee/cloud';
import DatastorePackager from '@ulixee/datastore-packager';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { Helpers } from '@ulixee/datastore-testing';
import Client from '..';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Client.query.test');
let cloudNode: CloudNode;
let apiClient: DatastoreApiClient;

beforeAll(async () => {
  cloudNode = await Helpers.createLocalNode({
    datastoreConfiguration: {
      datastoresDir: storageDir,
    },
  });
  apiClient = new DatastoreApiClient(await cloudNode.address);
  Helpers.onClose(() => apiClient.disconnect(), true);
});

afterAll(Helpers.afterAll);

test('should be able to query a datastore using sql', async () => {
  const packager = new DatastorePackager(`${__dirname}/datastores/query.js`);
  await packager.build({ createTemporaryVersion: true });
  await expect(apiClient.upload(await packager.dbx.tarGzip())).resolves.toBeTruthy();
  const cloudNodeAddress = await cloudNode.address;
  const client = new Client(
    `ulx://${cloudNodeAddress}/${packager.manifest.id}/${packager.manifest.version}`,
  );
  Helpers.onClose(() => client.disconnect());
  const results = await client.query(
    'SELECT * FROM test(shouldTest => $1) LEFT JOIN testers on testers.lastName=test.lastName',
    [true],
  );
  await client.disconnect();
  expect(results).toEqual([
    {
      testerEcho: true,
      lastName: 'Clark',
      greeting: 'Hello world',
      firstName: 'Caleb',
      testerNumber: 1n,
    },
  ]);
});
