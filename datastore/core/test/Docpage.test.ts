import { CloudNode } from '@ulixee/cloud';
import Identity from '@ulixee/platform-utils/lib/Identity';
import DatastorePackager from '@ulixee/datastore-packager';
import * as Helpers from '@ulixee/datastore-testing/helpers';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import Axios from 'axios';
import * as Fs from 'fs';
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
  const res = await Axios.get(`http://${address}/${manifest.id}@v${manifest.version}`);
  expect(res.data.includes('<title>Ulixee</title>')).toBe(true);

  const config = await Axios.get(
    `http://${address}/${manifest.id}@v${manifest.version}/docpage.json`,
  );
  expect(config.data.name).toBe('Docpage');
});

test('should be able to load datastore documentation with a credit hash', async () => {
  const address = await cloudNode.address;
  const res = await Axios.get(
    `http://${address}/${manifest.id}@v${manifest.version}?crd2342342`,
  );
  expect(res.data.includes('<title>Ulixee</title>')).toBe(true);
  const config = await Axios.get(
    `http://${address}/${manifest.id}@v${manifest.version}/docpage.json`,
  );
  expect(config.data.name).toBe('Docpage');
});

test('should be able to get a credit balance', async () => {
  const credits = await client.createCredits(manifest.id, manifest.version, 1002, adminIdentity);

  await expect(
    Axios.get(
      `http://${await cloudNode.address}/${manifest.id}@v${manifest.version}/free-credit?${
        credits.id
      }:${credits.secret}`,
      { responseType: 'json', headers: { accept: 'application/json' } },
    ).then(x => x.data),
  ).resolves.toEqual({
    balance: 1002,
    issuedCredits: 1002,
  });
});

test('should be able to parse datastore urls', async () => {
  const expectedOutput = {
    host: await cloudNode.address,
    datastoreId: manifest.id,
    version: manifest.version,
    domain: null,
  };

  await expect(
    DatastoreApiClient.lookupDatastoreHost(
      `${await cloudNode.address}/${manifest.id}@v${
        manifest.version
      }/free-credit?crd2342342:234234333`,
      null,
    ),
  ).resolves.toEqual(expectedOutput);

  await expect(
    DatastoreApiClient.lookupDatastoreHost(
      `${await cloudNode.address}/${manifest.id}@v${manifest.version}`,
      null,
    ),
  ).resolves.toEqual(expectedOutput);

  await expect(
    DatastoreApiClient.lookupDatastoreHost(`localhost:52759/i-am-a-datastore@v2.0.0`, null),
  ).resolves.toEqual({
    host: 'localhost:52759',
    datastoreId: 'i-am-a-datastore',
    version: '2.0.0',
    domain: null,
  });

  await expect(
    DatastoreApiClient.lookupDatastoreHost(
      `ulx://${await cloudNode.address}/${manifest.id}@v${
        manifest.version
      }/free-credit/?crd2342342:234234333`,
      null,
    ),
  ).resolves.toEqual(expectedOutput);
});
