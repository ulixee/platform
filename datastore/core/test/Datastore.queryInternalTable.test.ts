import * as Fs from 'fs';
import * as Path from 'path';
import UlixeeMiner from '@ulixee/miner';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import directTable from './datastores/directTable';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Datastore.queryInternalTable.test');

let miner: UlixeeMiner;

beforeAll(async () => {
  jest.spyOn<any, any>(UlixeeHostsConfig.global, 'save').mockImplementation(() => null);
  if (Fs.existsSync(`${__dirname}/datastores/directTable.dbx`)) {
    Fs.unlinkSync(`${__dirname}/datastores/directTable.dbx`);
  }
  miner = new UlixeeMiner();
  miner.router.datastoreConfiguration = { datastoresDir: storageDir };
  await miner.listen();
});

afterAll(async () => {
  if (Fs.existsSync(storageDir)) Fs.rmdirSync(storageDir, { recursive: true });
  await miner.close();
});

test('should be able to query table directly', async () => {
  const data = await directTable.queryInternal('SELECT * FROM self');

  expect(data).toMatchObject([
    { title: 'Hello', success: true },
    { title: 'World', success: false }
  ]);
});
