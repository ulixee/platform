import * as Fs from 'fs';
import * as Path from 'path';
import { CloudNode } from '@ulixee/cloud';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import directDatastore from './datastores/direct';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Datastore.queryInternal.test');

let cloudNode: CloudNode;

beforeAll(async () => {
  jest.spyOn<any, any>(UlixeeHostsConfig.global, 'save').mockImplementation(() => null);

  cloudNode = new CloudNode();
  cloudNode.router.datastoreConfiguration = { datastoresDir: storageDir };
  await cloudNode.listen();
});

afterAll(async () => {
  await cloudNode.close();
  if (Fs.existsSync(storageDir)) Fs.rmdirSync(storageDir, { recursive: true });
});

test('query datastore table', async () => {
  const records = await directDatastore.queryInternal('SELECT * FROM testers');
  expect(records).toMatchObject([
    { firstName: 'Caleb', lastName: 'Clark', isTester: true },
    { firstName: 'Blake', lastName: 'Byrnes', isTester: null },
  ]);
}, 30e3);

test('query datastore runner', async () => {
  const records = await directDatastore.queryInternal('SELECT * FROM test(shouldTest => true)');
  expect(records).toMatchObject([
    {
      testerEcho: true,
      greeting: 'Hello world',
    },
  ]);
}, 30e3);

test('query specific fields on runner', async () => {
  const records = await directDatastore.queryInternal('SELECT greeting FROM test(shouldTest => true)');
  expect(records).toMatchObject([
    {
      greeting: 'Hello world',
    },
  ]);
}, 30e3);

test('left join table on runners', async () => {
  const sql = `SELECT greeting, firstName FROM test(shouldTest => true) LEFT JOIN testers ON testers.isTester=test.shouldTest`;
  const records = await directDatastore.queryInternal(sql);
  expect(records).toMatchObject([
    {
      greeting: 'Hello world',
      firstName: 'Caleb',
    },
  ]);
}, 30e3);
