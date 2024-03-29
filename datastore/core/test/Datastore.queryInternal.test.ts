import { CloudNode } from '@ulixee/cloud';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import { Helpers } from '@ulixee/datastore-testing';
import IStorageEngine from '@ulixee/datastore/interfaces/IStorageEngine';
import * as Fs from 'fs';
import * as Path from 'path';
import directDatastore from './datastores/direct';
import directExtractorInternal from './datastores/directExtractorInternal';
import directTable from './datastores/directTable';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Datastore.queryInternal.test');

let cloudNode: CloudNode;
const storages: IStorageEngine[] = [];

beforeAll(async () => {
  jest.spyOn<any, any>(UlixeeHostsConfig.global, 'save').mockImplementation(() => null);
  for (const dbx of ['directExtractorInternal', 'direct', 'directTable']) {
    if (Fs.existsSync(`${__dirname}/datastores/${dbx}.dbx`)) {
      await Fs.promises.rm(`${__dirname}/datastores/${dbx}.dbx`, { recursive: true });
    }
  }

  cloudNode = await Helpers.createLocalNode(
    {
      datastoreConfiguration: { datastoresDir: storageDir },
    },
    true,
  );
  const storage1 = (await directDatastore.bind({})).storageEngine;
  const storage2 = (await directExtractorInternal.bind({})).storageEngine;
  const storage3 = (await directTable.bind({})).storageEngine;
  storages.push(storage1, storage2, storage3);
});

afterAll(async () => {
  for (const storage of storages) await storage.close();
  await Helpers.afterAll();
});

test('query datastore table', async () => {
  const records = await directDatastore.queryInternal('SELECT * FROM testers');
  expect(records).toMatchObject([
    { firstName: 'Caleb', lastName: 'Clark', isTester: true },
    { firstName: 'Blake', lastName: 'Byrnes', isTester: null },
  ]);
}, 30e3);

test('query datastore extractor', async () => {
  const records = await directDatastore.queryInternal('SELECT * FROM test(shouldTest => true)');
  expect(records).toMatchObject([
    {
      testerEcho: true,
      greeting: 'Hello world',
    },
  ]);
}, 30e3);

test('query specific fields on extractor', async () => {
  const records = await directDatastore.queryInternal(
    'SELECT greeting FROM test(shouldTest => true)',
  );
  expect(records).toMatchObject([
    {
      greeting: 'Hello world',
    },
  ]);
}, 30e3);

test('left join table on extractors', async () => {
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
  const data = await directExtractorInternal.queryInternal('SELECT * FROM self(tester => true)');
  expect(data).toMatchObject([{ testerEcho: true }]);
}, 30e3);

test('should be able to query table directly', async () => {
  const data = await directTable.queryInternal('SELECT * FROM self');

  expect(data).toMatchObject([
    { title: 'Hello', success: true },
    { title: 'World', success: false },
  ]);
});
