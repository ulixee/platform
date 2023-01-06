import * as Fs from 'fs';
import * as Path from 'path';
import UlixeeMiner from '@ulixee/miner';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import directFunction from './datastores/directFunction';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Datastore.queryInternalFunctionResult.test');

let miner: UlixeeMiner;

beforeAll(async () => {
  jest.spyOn<any, any>(UlixeeHostsConfig.global, 'save').mockImplementation(() => null);
  if (Fs.existsSync(`${__dirname}/datastores/directFunction.dbx`)) {
    Fs.unlinkSync(`${__dirname}/datastores/directFunction.dbx`);
  }
  miner = new UlixeeMiner();
  miner.router.datastoreConfiguration = { datastoresDir: storageDir };
  await miner.listen();
});

afterAll(async () => {
  if (Fs.existsSync(storageDir)) Fs.rmdirSync(storageDir, { recursive: true });
  await miner.close();
});

test('should be able to query function directly', async () => {
  const data = await directFunction.query('SELECT * FROM self(tester => true)');
  expect(data).toMatchObject([
    { testerEcho: true },
  ]);
}, 30e3);

