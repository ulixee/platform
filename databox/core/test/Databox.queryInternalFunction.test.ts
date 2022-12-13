import * as Fs from 'fs';
import * as Path from 'path';
import UlixeeMiner from '@ulixee/miner';
import DataboxApiClient from '@ulixee/databox/lib/DataboxApiClient';
import directFunction from './databoxes/directFunction';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Databox.query.test');

let miner: UlixeeMiner;
let client: DataboxApiClient;

beforeAll(async () => {
  if (Fs.existsSync(`${__dirname}/databoxes/directFunction.dbx`)) {
    Fs.unlinkSync(`${__dirname}/databoxes/directFunction.dbx`);
  }
  miner = new UlixeeMiner();
  miner.router.databoxConfiguration = { databoxesDir: storageDir };
  await miner.listen();
  client = new DataboxApiClient(await miner.address);
});

afterAll(async () => {
  Fs.rmdirSync(storageDir, { recursive: true });
  await miner.close();
});

test('should be able to query function directly', async () => {
  const data = await directFunction.query('SELECT * FROM self(tester => true)');
  expect(data).toMatchObject([ 
    { testerEcho: true },
  ]);
}, 30e3);

