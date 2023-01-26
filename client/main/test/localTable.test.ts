import * as Fs from 'fs';
import * as Path from 'path';
import UlixeeMiner from '@ulixee/miner';
import Client from '..';
import localTable from './datastores/localTable';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Client.localTable.test');
let miner: UlixeeMiner;

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
  const client = new Client(localTable);
  const results = await client.query('SELECT * FROM self');

  expect(results).toEqual([
    {
      firstName: 'Caleb',
      lastName: 'Clark',
      isTester: true,
    },
    {
      firstName: 'Blake',
      lastName: 'Byrnes',
      isTester: null,
    }
  ]);
});
