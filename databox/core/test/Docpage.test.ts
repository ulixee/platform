import * as Fs from 'fs';
import * as Path from 'path';
import Axios from 'axios';
import DataboxPackager from '@ulixee/databox-packager';
import UlixeeMiner from '@ulixee/miner';
import DataboxApiClient from '@ulixee/databox/lib/DataboxApiClient';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import IDataboxManifest from '@ulixee/specification/types/IDataboxManifest';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Databox.docpage.test');

let dbxFile: Buffer;
let miner: UlixeeMiner;
let manifest: IDataboxManifest;
let client: DataboxApiClient;

beforeAll(async () => {
  jest.spyOn<any, any>(UlixeeHostsConfig.global, 'save').mockImplementation(() => null);
  const packager = new DataboxPackager(`${__dirname}/databoxes/docpage.js`);
  await packager.build();
  dbxFile = await packager.dbx.asBuffer();
  manifest = packager.manifest.toJSON();
  miner = new UlixeeMiner();
  miner.router.databoxConfiguration = { databoxesDir: storageDir };
  await miner.listen();
  client = new DataboxApiClient(await miner.address);
});

afterAll(async () => {
  await miner?.close();
  if (Fs.existsSync(storageDir)) {
    if (Fs.existsSync(storageDir)) Fs.rmSync(storageDir, { recursive: true });
  }
});

test('should be able to load databox documentation', async () => {
  await client.upload(dbxFile);
  const address = await miner.address;
  const res = await Axios.get(`http://${address}/databox/${manifest.versionHash}/`);
  expect(res.data.includes('Docpage - Ulixee Datastore')).toBe(true);
});
