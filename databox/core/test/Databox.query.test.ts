import * as Fs from 'fs';
import * as Path from 'path';
import UlixeeMiner from '@ulixee/miner';
import DataboxApiClient from '@ulixee/databox/lib/DataboxApiClient';
import directDatabox from './databoxes/direct';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Databox.exec.test');

let miner: UlixeeMiner;
let client: DataboxApiClient;

beforeAll(async () => {
  if (Fs.existsSync(`${__dirname}/databoxes/direct.dbx`)) {
    Fs.unlinkSync(`${__dirname}/databoxes/direct.dbx`);
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

test('query databox table', async () => {
  const records = await directDatabox.query('SELECT * FROM testers');
  expect(records).toMatchObject([
    { firstName: 'Caleb', lastName: 'Clark', isTester: true },
    { firstName: 'Blake', lastName: 'Byrnes', isTester: null }
  ]);
});

test('query databox function', async () => {
  const records = await directDatabox.query('SELECT * FROM test(shouldTest => true)');
  expect(records).toMatchObject([{ 
    testerEcho: true, 
    greeting: 'Hello world' 
  }]);
});

test('query specific fields on function', async () => {
  const records = await directDatabox.query('SELECT greeting FROM test(shouldTest => true)');
  expect(records).toMatchObject([{ 
    greeting: 'Hello world' 
  }]);
});

test('left join table on functions', async () => {
  const sql = `SELECT greeting, firstName FROM test(shouldTest => true) LEFT JOIN testers ON testers.isTester=test.shouldTest`;
  const records = await directDatabox.query(sql);
  expect(records).toMatchObject([{ 
    greeting: 'Hello world',
    firstName: 'Caleb',
  }]);
});
