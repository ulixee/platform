import * as Fs from 'fs';
import * as Path from 'path';
import DatastorePackager from '@ulixee/datastore-packager';
import UlixeeMiner from '@ulixee/miner';
import Identity from '@ulixee/crypto/lib/Identity';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Datastore.query.test');

let miner: UlixeeMiner;
let client: DatastoreApiClient;

beforeAll(async () => {
  if (Fs.existsSync(`${__dirname}/datastores/query.dbx`)) {
    Fs.unlinkSync(`${__dirname}/datastores/query.dbx`);
  }
  if (Fs.existsSync(`${__dirname}/datastores/directRunner.dbx`)) {
    Fs.unlinkSync(`${__dirname}/datastores/directRunner.dbx`);
  }

  miner = new UlixeeMiner();
  miner.router.datastoreConfiguration = { datastoresDir: storageDir };
  await miner.listen();
  client = new DatastoreApiClient(await miner.address);
});

afterAll(async () => {
  await miner.close();
  if (Fs.existsSync(storageDir)) Fs.rmSync(storageDir, { recursive: true });
});

test('should be able to query a datastore runner', async () => {
  const packager = new DatastorePackager(`${__dirname}/datastores/query.js`);
  await packager.build();
  await client.upload(await packager.dbx.asBuffer());
  await expect(
    client.query(packager.manifest.versionHash, 'SELECT success FROM query()'),
  ).resolves.toEqual({
    outputs: [{ success: true }],
    metadata: expect.any(Object),
    latestVersionHash: expect.any(String),
  });
});

test('should be able to require authentication for a datastore', async () => {
  const id = Identity.createSync();
  Fs.writeFileSync(
    `${__dirname}/datastores/auth.js`,
    Fs.readFileSync(`${__dirname}/datastores/auth.js`, 'utf8').replace(
      /const allowedId = 'id1.+';/,
      `const allowedId = '${id.bech32}';`,
    ),
  );

  const packager = new DatastorePackager(`${__dirname}/datastores/auth.js`);
  await packager.build();
  await client.upload(await packager.dbx.asBuffer());
  const auth = DatastoreApiClient.createExecAuthentication(null, id);
  await expect(
    client.query(packager.manifest.versionHash, 'select * from authme()'),
  ).rejects.toThrowError('authentication');

  await expect(
    client.query(packager.manifest.versionHash, 'select * from authme()', { authentication: auth }),
  ).resolves.toBeTruthy();
});

test('should be able to query a function packaged without a datastore', async () => {
  const packager = new DatastorePackager(`${__dirname}/datastores/directRunner.js`);
  await packager.build();
  await client.upload(await packager.dbx.asBuffer());
  await expect(
    client.query(packager.manifest.versionHash, 'SELECT testerEcho FROM default(tester => $1)', {
      boundValues: [false],
    }),
  ).resolves.toEqual({
    outputs: [{ testerEcho: false }],
    metadata: expect.any(Object),
    latestVersionHash: expect.any(String),
  });
});
