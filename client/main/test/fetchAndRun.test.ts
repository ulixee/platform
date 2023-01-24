import * as Fs from 'fs';
import * as Path from 'path';
import UlixeeMiner from '@ulixee/miner';
import DatastorePackager from '@ulixee/datastore-packager';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import Client from '..';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Client.fetch.test');
let miner: UlixeeMiner;
let apiClient: DatastoreApiClient;

beforeAll(async () => {
  miner = new UlixeeMiner();
  miner.router.datastoreConfiguration = { datastoresDir: storageDir };
  await miner.listen();
  apiClient = new DatastoreApiClient(await miner.address);
});

afterAll(async () => {
  await miner.close();
  if (Fs.existsSync(storageDir)) Fs.rmSync(storageDir, { recursive: true });
});

test('should be able to fetch a datastore table', async () => {
  const packager = new DatastorePackager(`${__dirname}/datastores/fetch.js`);
  await packager.build();
  await apiClient.upload(await packager.dbx.asBuffer());
  const minerAddress = await miner.address;
  const client = new Client(`ulx://${minerAddress}/${packager.manifest.versionHash}`);
  const results = await client.fetch('testers');
  
  expect(results).toEqual([
    { firstName: 'Caleb', lastName: 'Clark', isTester: true },
    { firstName: 'Blake', lastName: 'Byrnes', isTester: null },
  ]);
});

test('should be able to run a datastore function', async () => {
  const packager = new DatastorePackager(`${__dirname}/datastores/fetch.js`);
  await packager.build();
  await apiClient.upload(await packager.dbx.asBuffer());
  const minerAddress = await miner.address;
  const client = new Client(`ulx://${minerAddress}/${packager.manifest.versionHash}`);
  const results = await client.run('test', { shouldTest: true });

  expect(results).toEqual([ 
    { testerEcho: true, greeting: 'Hello world' },
  ]);
});