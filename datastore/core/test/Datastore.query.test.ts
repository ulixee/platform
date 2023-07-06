import * as Fs from 'fs';
import * as Path from 'path';
import DatastorePackager from '@ulixee/datastore-packager';
import { CloudNode } from '@ulixee/cloud';
import { Helpers } from '@ulixee/datastore-testing';
import Identity from '@ulixee/crypto/lib/Identity';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Datastore.query.test');

let cloudNode: CloudNode;
let client: DatastoreApiClient;

beforeAll(async () => {
  if (Fs.existsSync(`${__dirname}/datastores/query.dbx`)) {
    Fs.rmSync(`${__dirname}/datastores/query.dbx`, { recursive: true });
  }
  if (Fs.existsSync(`${__dirname}/datastores/directExtractor.dbx`)) {
    Fs.rmSync(`${__dirname}/datastores/directExtractor.dbx`, { recursive: true });
  }

  cloudNode = await Helpers.createLocalNode(
    {
      datastoreConfiguration: {
        datastoresDir: storageDir,
        datastoresTmpDir: Path.join(storageDir, 'tmp'),
      },
    },
    true,
  );
  client = new DatastoreApiClient(await cloudNode.address);
  Helpers.onClose(() => client.disconnect(), true);
});

afterEach(Helpers.afterEach);
afterAll(Helpers.afterAll);

test('should be able to query a datastore extractor', async () => {
  const packager = new DatastorePackager(`${__dirname}/datastores/query.js`);
  await packager.build();
  await client.upload(await packager.dbx.tarGzip());
  await expect(
    client.query(
      packager.manifest.id,
      packager.manifest.version,
      'SELECT success FROM query()',
    ),
  ).resolves.toEqual({
    outputs: [{ success: true }],
    metadata: expect.any(Object),
    latestVersion: expect.any(String),
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
  await client.upload(await packager.dbx.tarGzip());
  const auth = DatastoreApiClient.createExecAuthentication(null, id);
  await expect(
    client.query(
      packager.manifest.id,
      packager.manifest.version,
      'select * from authme()',
    ),
  ).rejects.toThrow('authentication');

  await expect(
    client.query(
      packager.manifest.id,
      packager.manifest.version,
      'select * from authme()',
      { authentication: auth },
    ),
  ).resolves.toBeTruthy();
});

test('should be able to query a function packaged without a datastore', async () => {
  const packager = new DatastorePackager(`${__dirname}/datastores/directExtractor.js`);
  await packager.build({ createTemporaryVersion: true });
  await client.upload(await packager.dbx.tarGzip());
  await expect(
    client.query(
      packager.manifest.id,
      packager.manifest.version,
      'SELECT testerEcho FROM default(tester => $1)',
      {
        boundValues: [false],
      },
    ),
  ).resolves.toEqual({
    outputs: [{ testerEcho: false }],
    metadata: expect.any(Object),
    latestVersion: expect.any(String),
  });
});
