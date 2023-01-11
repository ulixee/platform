import * as Fs from 'fs';
import * as Path from 'path';
import Axios from 'axios';
import DatastorePackager from '@ulixee/datastore-packager';
import UlixeeMiner from '@ulixee/miner';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import IDatastoreManifest from '@ulixee/specification/types/IDatastoreManifest';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Datastore.docpage.test');

let dbxFile: Buffer;
let miner: UlixeeMiner;
let manifest: IDatastoreManifest;
let client: DatastoreApiClient;

beforeAll(async () => {
  jest.spyOn<any, any>(UlixeeHostsConfig.global, 'save').mockImplementation(() => null);

  if (Fs.existsSync(`${__dirname}/datastores/docpage.dbx.build`)) {
    Fs.rmSync(`${__dirname}/datastores/docpage.dbx.build`, { recursive: true });
  }
  const packager = new DatastorePackager(`${__dirname}/datastores/docpage.js`);
  await packager.build();
  dbxFile = await packager.dbx.asBuffer();
  manifest = packager.manifest.toJSON();
  miner = new UlixeeMiner();
  miner.router.datastoreConfiguration = { datastoresDir: storageDir };
  await miner.listen();
  client = new DatastoreApiClient(await miner.address);
});

afterAll(async () => {
  await miner?.close();
  if (Fs.existsSync(storageDir)) {
    if (Fs.existsSync(storageDir)) Fs.rmSync(storageDir, { recursive: true });
  }
});

test('should be able to load datastore documentation', async () => {
  await client.upload(dbxFile);
  const address = await miner.address;
  const res = await Axios.get(`http://${address}/datastore/${manifest.versionHash}/`);
  expect(res.data.includes('Docpage - Ulixee Datastore')).toBe(true);
});
