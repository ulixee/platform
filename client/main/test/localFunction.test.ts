import * as Fs from 'fs';
import * as Path from 'path';
import UlixeeMiner from '@ulixee/miner';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import Client from '..';
import localFunction from './datastores/localFunction';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Client.localFunction.test');
let miner: UlixeeMiner;
let apiClient: DatastoreApiClient;

beforeAll(async () => {
  miner = new UlixeeMiner();
  miner.router.datastoreConfiguration = { datastoresDir: storageDir };
  await miner.listen();
});

afterAll(async () => {
  await miner.close();
  if (Fs.existsSync(storageDir)) Fs.rmSync(storageDir, { recursive: true });
});

test('should be able to query a datastore using sql', async () => {
  const client = new Client(localFunction);
  const results = await client.query('SELECT * FROM test(shouldTest => $1)', [true]);

  expect(results).toEqual([
    {
      testerEcho: true,
      lastName: 'Clark',
      greeting: 'Hello world',
    }
  ]);
});
