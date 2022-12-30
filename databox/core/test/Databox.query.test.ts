import * as Fs from 'fs';
import * as Path from 'path';
import DataboxPackager from '@ulixee/databox-packager';
import UlixeeMiner from '@ulixee/miner';
import Identity from '@ulixee/crypto/lib/Identity';
import DataboxApiClient from '@ulixee/databox/lib/DataboxApiClient';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Databox.query.test');

let miner: UlixeeMiner;
let client: DataboxApiClient;

beforeAll(async () => {
  if (Fs.existsSync(`${__dirname}/databoxes/query.dbx`)) {
    Fs.unlinkSync(`${__dirname}/databoxes/query.dbx`);
  }
  if (Fs.existsSync(`${__dirname}/databoxes/directFunction.dbx`)) {
    Fs.unlinkSync(`${__dirname}/databoxes/directFunction.dbx`);
  }

  miner = new UlixeeMiner();
  miner.router.databoxConfiguration = { databoxesDir: storageDir };
  await miner.listen();
  client = new DataboxApiClient(await miner.address);
});

afterAll(async () => {
  await miner.close();
  if (Fs.existsSync(storageDir)) Fs.rmSync(storageDir, { recursive: true });
});

test('should be able to query a databox function', async () => {
  const packager = new DataboxPackager(`${__dirname}/databoxes/query.js`);
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

test('should be able to require authentication for a databox', async () => {
  const id = Identity.createSync();
  Fs.writeFileSync(
    `${__dirname}/databoxes/auth.js`,
    Fs.readFileSync(`${__dirname}/databoxes/auth.js`, 'utf8').replace(
      /const allowedId = 'id1.+';/,
      `const allowedId = '${id.bech32}';`,
    ),
  );

  const packager = new DataboxPackager(`${__dirname}/databoxes/auth.js`);
  await packager.build();
  await client.upload(await packager.dbx.asBuffer());
  const auth = DataboxApiClient.createExecAuthentication(null, id);
  await expect(
    client.query(packager.manifest.versionHash, 'select * from authme()'),
  ).rejects.toThrowError('authentication');

  await expect(
    client.query(packager.manifest.versionHash, 'select * from authme()', { authentication: auth }),
  ).resolves.toBeTruthy();
});

test('should be able to query a function packaged without a databox', async () => {
  const packager = new DataboxPackager(`${__dirname}/databoxes/directFunction.js`);
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
