import * as Fs from 'fs';
import * as Path from 'path';
import { CloudNode } from '@ulixee/cloud';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import directRunner from './datastores/directRunner';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Datastore.queryInternalFunctionResult.test');

let cloudNode: CloudNode;

beforeAll(async () => {
  jest.spyOn<any, any>(UlixeeHostsConfig.global, 'save').mockImplementation(() => null);
  if (Fs.existsSync(`${__dirname}/datastores/directRunner.dbx`)) {
    Fs.unlinkSync(`${__dirname}/datastores/directRunner.dbx`);
  }
  cloudNode = new CloudNode();
  cloudNode.router.datastoreConfiguration = { datastoresDir: storageDir };
  await cloudNode.listen();
});

afterAll(async () => {
  if (Fs.existsSync(storageDir)) Fs.rmdirSync(storageDir, { recursive: true });
  await cloudNode.close();
});

test('should be able to query function directly', async () => {
  const data = await directRunner.queryInternal('SELECT * FROM self(tester => true)');
  expect(data).toMatchObject([
    { testerEcho: true },
  ]);
}, 30e3);

