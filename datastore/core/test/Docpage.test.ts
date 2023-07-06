import { CloudNode } from '@ulixee/cloud';
import Identity from '@ulixee/crypto/lib/Identity';
import DatastorePackager from '@ulixee/datastore-packager';
import * as Helpers from '@ulixee/datastore-testing/helpers';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import Axios from 'axios';
import * as Fs from 'fs';
import * as Hostile from 'hostile';
import * as Path from 'path';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Datastore.docpage.test');

let dbxFile: Buffer;
let cloudNode: CloudNode;
let manifest: IDatastoreManifest;
let client: DatastoreApiClient;
const adminIdentity = Identity.createSync();

beforeAll(async () => {
  Helpers.blockGlobalConfigWrites();

  if (Fs.existsSync(`${__dirname}/datastores/docpage.dbx`)) {
    Fs.rmSync(`${__dirname}/datastores/docpage.dbx`, { recursive: true });
  }
  if (process.env.CI !== 'true') {
    Hostile.set('127.0.0.1', 'docs.datastoresrus.com');
    Helpers.onClose(() => Hostile.remove('127.0.0.1', 'docs.datastoresrus.com'), true);
  }
  const packager = new DatastorePackager(`${__dirname}/datastores/docpage.js`);
  await packager.build();
  dbxFile = await packager.dbx.tarGzip();
  manifest = packager.manifest.toJSON();

  cloudNode = await Helpers.createLocalNode(
    {
      datastoreConfiguration: {
        datastoresDir: storageDir,
        cloudAdminIdentities: [adminIdentity.bech32],
      },
    },
    true,
  );
  client = new DatastoreApiClient(await cloudNode.address);
  await client.upload(dbxFile, { identity: adminIdentity });
});

afterEach(Helpers.afterEach);

afterAll(async () => {
  await Helpers.afterAll();
});

test('should be able to load datastore documentation', async () => {
  const address = await cloudNode.address;
  const res = await Axios.get(`http://${address}/docs/${manifest.id}/${manifest.version}`);
  expect(res.data.includes('<title>Ulixee</title>')).toBe(true);

  const config = await Axios.get(
    `http://${address}/docs/${manifest.id}/${manifest.version}/docpage.json`,
  );
  expect(config.data.name).toBe('Docpage');
});

test('should be able to load datastore documentation with a credit hash', async () => {
  const address = await cloudNode.address;
  const res = await Axios.get(
    `http://${address}/docs/${manifest.id}/${manifest.version}?crd2342342`,
  );
  expect(res.data.includes('<title>Ulixee</title>')).toBe(true);
  const config = await Axios.get(
    `http://${address}/docs/${manifest.id}/${manifest.version}/docpage.json`,
  );
  expect(config.data.name).toBe('Docpage');
});

test('should be able to access documentation through a datastore domain', async () => {
  const port = await cloudNode.port;
  const res = await Axios.get(`http://docs.datastoresRus.com:${port}`);
  expect(res.data.includes('<title>Ulixee</title>')).toBe(true);
  const config = await Axios.get(`http://docs.datastoresRus.com:${port}/docpage.json`);
  expect(config.data.name).toBe('Docpage');
});

test('should be able to use a domain to get a credit balance', async () => {
  const port = await cloudNode.port;
  const credits = await client.createCredits(
    manifest.id,
    manifest.version,
    1002,
    adminIdentity,
  );
  await expect(
    Axios.get(
      `http://docs.datastoresRus.com:${port}/free-credits?${credits.id}:${credits.secret}`,
      {
        responseType: 'json',
        headers: { accept: 'application/json' },
      },
    ).then(x => x.data),
  ).resolves.toEqual({
    balance: 1002,
    issuedCredits: 1002,
  });

  // can also use the full address
  await expect(
    Axios.get(
      `http://${await cloudNode.address}/docs/${manifest.id}/${manifest.version}/free-credits?${
        credits.id
      }:${credits.secret}`,
      { responseType: 'json', headers: { accept: 'application/json' } },
    ).then(x => x.data),
  ).resolves.toEqual({
    balance: 1002,
    issuedCredits: 1002,
  });
});

test('should be able to parse domain urls', async () => {
  const port = await cloudNode.port;
  const expectedOutput = {
    host: await cloudNode.address,
    datastoreId: manifest.id,
    datastoreVersion: manifest.version,
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
      `${await cloudNode.address}/docs/${manifest.id}/${manifest.version}`,
    ),
  ).resolves.toEqual(expectedOutput);

  await expect(
    DatastoreApiClient.resolveDatastoreDomain(`localhost:52759/docs/i-am-a-datastore/2.0.0`),
  ).resolves.toEqual({
    host: 'localhost:52759',
    datastoreId: 'i-am-a-datastore',
    datastoreVersion: '2.0.0',
  });

  await expect(
    DatastoreApiClient.resolveDatastoreDomain(
      `ulx://${await cloudNode.address}/docs/${manifest.id}/${
        manifest.version
      }/free-credit/?crd2342342:234234333`,
    ),
  ).resolves.toEqual(expectedOutput);
});
