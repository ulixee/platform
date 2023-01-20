import * as Fs from 'fs';
import * as Path from 'path';
import Axios from 'axios';
import DatastorePackager from '@ulixee/datastore-packager';
import UlixeeMiner from '@ulixee/miner';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import IDatastoreManifest from '@ulixee/specification/types/IDatastoreManifest';
import * as Hostile from 'hostile';

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
  Hostile.set('127.0.0.1', 'docs.datastoresrus.com');
  const packager = new DatastorePackager(`${__dirname}/datastores/docpage.js`);
  await packager.build();
  dbxFile = await packager.dbx.asBuffer();
  manifest = packager.manifest.toJSON();
  miner = new UlixeeMiner();
  miner.router.datastoreConfiguration = { datastoresDir: storageDir };
  await miner.listen();
  client = new DatastoreApiClient(await miner.address);
  await client.upload(dbxFile);
});

afterAll(async () => {
  await miner?.close();
  Hostile.remove('127.0.0.1', 'docs.datastoresrus.com');
  if (Fs.existsSync(storageDir)) {
    if (Fs.existsSync(storageDir)) Fs.rmSync(storageDir, { recursive: true });
  }
});

test('should be able to load datastore documentation', async () => {
  const address = await miner.address;
  const res = await Axios.get(`http://${address}/datastore/${manifest.versionHash}/`);
  expect(res.data.includes('Docpage - Ulixee Datastore')).toBe(true);
});

test('should be able to access documentation through a datastore domain', async () => {
  const port = await miner.port;
  const res = await Axios.get(`http://docs.datastoresRus.com:${port}`);
  expect(res.data.includes('Docpage - Ulixee Datastore')).toBe(true);
});

test('should be able to parse domain urls', async () => {
  const port = await miner.port;
  const expectedOutput = {
    host: await miner.address,
    datastoreVersionHash: manifest.versionHash,
  };
  await expect(
    DatastoreApiClient.resolveDatastoreDomain(`http://docs.datastoresRus.com:${port}`),
  ).resolves.toEqual(expectedOutput);

  await expect(
    DatastoreApiClient.resolveDatastoreDomain(
      `docs.datastoresRus.com:${port}/free-credit?crd2342342:234234333`,
    ),
  ).resolves.toEqual(expectedOutput);

  await expect(
    DatastoreApiClient.resolveDatastoreDomain(
      `${await miner.address}/datastore/${manifest.versionHash}`,
    ),
  ).resolves.toEqual(expectedOutput);

  await expect(
    DatastoreApiClient.resolveDatastoreDomain(`localhost:52759/datastore/dbx1wwqx5h854eq6tq9ggl`),
  ).resolves.toEqual({
    host: 'localhost:52759',
    datastoreVersionHash: 'dbx1wwqx5h854eq6tq9ggl',
  });

  await expect(
    DatastoreApiClient.resolveDatastoreDomain(
      `ulx://${await miner.address}/datastore/${
        manifest.versionHash
      }/free-credit/?crd2342342:234234333`,
    ),
  ).resolves.toEqual(expectedOutput);
});
