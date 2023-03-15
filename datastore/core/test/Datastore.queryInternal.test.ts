import * as Fs from 'fs';
import * as Path from 'path';
import { CloudNode } from '@ulixee/cloud';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import directDatastore from './datastores/direct';
import directRunner from './datastores/directRunner';
import directTable from './datastores/directTable';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Datastore.queryInternal.test');

let cloudNode: CloudNode;

beforeAll(async () => {
  jest.spyOn<any, any>(UlixeeHostsConfig.global, 'save').mockImplementation(() => null);
  for (const dbx of ['directRunner', 'direct', 'directTable']) {
    if (Fs.existsSync(`${__dirname}/datastores/${dbx}.dbx`)) {
      await Fs.promises.rm(`${__dirname}/datastores/${dbx}.dbx`, { recursive: true });
    }
  }

  cloudNode = new CloudNode();
  cloudNode.router.datastoreConfiguration = { datastoresDir: storageDir };
  await directDatastore.bind({});
  await directRunner.bind({});
  await directTable.bind({});
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
  const records = await directDatastore.queryInternal(
    'SELECT greeting FROM test(shouldTest => true)',
  );
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

test('should be able to query function directly', async () => {
  const data = await directRunner.queryInternal('SELECT * FROM self(tester => true)');
  expect(data).toMatchObject([{ testerEcho: true }]);
}, 30e3);

test('should be able to query table directly', async () => {
  const data = await directTable.queryInternal('SELECT * FROM self');

  expect(data).toMatchObject([
    { title: 'Hello', success: true },
    { title: 'World', success: false },
  ]);
});
