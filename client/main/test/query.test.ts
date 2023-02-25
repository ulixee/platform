import * as Fs from 'fs';
import * as Path from 'path';
import UlixeeMiner from '@ulixee/miner';
import DatastorePackager from '@ulixee/datastore-packager';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import Client from '..';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Client.query.test');
let miner: UlixeeMiner;
let apiClient: DatastoreApiClient;

beforeAll(async () => {
  miner = new UlixeeMiner();
  miner.router.datastoreConfiguration = {
    datastoresDir: storageDir,
    datastoresTmpDir: Path.join(storageDir, 'tmp'),
  };
  await miner.listen();
  apiClient = new DatastoreApiClient(await miner.address);
});

afterAll(async () => {
  await miner.close();
  if (Fs.existsSync(storageDir)) Fs.rmSync(storageDir, { recursive: true });
});

test('should be able to query a datastore using sql', async () => {
  const packager = new DatastorePackager(`${__dirname}/datastores/query.js`);
  await packager.build();
  await apiClient.upload(await packager.dbx.asBuffer());
  const minerAddress = await miner.address;
  const client = new Client(`ulx://${minerAddress}/${packager.manifest.versionHash}`);
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
