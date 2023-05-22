import { CloudNode } from '@ulixee/cloud';
import Identity from '@ulixee/crypto/lib/Identity';
import DatastorePackager from '@ulixee/datastore-packager';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { Helpers } from '@ulixee/datastore-testing';
import * as Fs from 'fs';
import * as Path from 'path';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Datastore.stream.test');
let cloudNode: CloudNode;
let client: DatastoreApiClient;

beforeAll(async () => {
  cloudNode = await Helpers.createLocalNode({
    datastoreConfiguration: {
      datastoresDir: storageDir,
    },
  }, true);
  await Fs.promises.rm(`${__dirname}/datastores/stream.dbx`, { recursive: true }).catch(() => null);
  await cloudNode.listen();
  client = new DatastoreApiClient(await cloudNode.address);
  Helpers.onClose(() => client.disconnect(), true);
});

afterAll(async () => {
  await Helpers.afterAll();
});

test('should be able to stream a datastore extractor', async () => {
  const packager = new DatastorePackager(`${__dirname}/datastores/stream.js`);
  await packager.build();
  await client.upload(await packager.dbx.tarGzip());
  let counter = 0;
  const outputs = [];
  const result = client.stream(packager.manifest.versionHash, 'streamer', {});
  await expect(result.resultMetadata).resolves.toEqual({
    metadata: {
      milliseconds: expect.any(Number),
      bytes: expect.any(Number),
      microgons: 0,
    },
    latestVersionHash: expect.any(String),
  });
  for await (const record of result) {
    counter += 1;
    outputs.push(record);
  }
  expect(counter).toBe(3);
  expect(outputs).toEqual([{ record: 0 }, { record: 1 }, { record: 2 }]);
});

test('should be able to stream a datastore table', async () => {
  const packager = new DatastorePackager(`${__dirname}/datastores/stream.js`);
  await packager.build();
  await client.upload(await packager.dbx.tarGzip());
  let counter = 0;
  const outputs = [];
  const result = client.stream(packager.manifest.versionHash, 'streamTable', { success: false });
  await expect(result.resultMetadata).resolves.toEqual({
    metadata: {
      milliseconds: expect.any(Number),
      bytes: expect.any(Number),
      microgons: 0,
    },
    latestVersionHash: expect.any(String),
  });
  for await (const record of result) {
    counter += 1;
    outputs.push(record);
  }
  expect(counter).toBe(1);
  expect(outputs).toEqual([{ title: 'World', success: false }]);
});

test('should be able to require authentication for a streamed extractor', async () => {
  const id = Identity.createSync();
  Fs.writeFileSync(
    `${__dirname}/datastores/streamedAuth.js`,
    Fs.readFileSync(`${__dirname}/datastores/streamedAuth.js`, 'utf8').replace(
      /const allowedId = 'id1.+';/,
      `const allowedId = '${id.bech32}';`,
    ),
  );

  const packager = new DatastorePackager(`${__dirname}/datastores/streamedAuth.js`);
  await packager.build();
  await client.upload(await packager.dbx.tarGzip());
  const auth = DatastoreApiClient.createExecAuthentication(null, id);
  await expect(client.stream(packager.manifest.versionHash, 'authme', {})).rejects.toThrowError(
    'authentication',
  );

  await expect(
    client.stream(packager.manifest.versionHash, 'authme', {}, { authentication: auth }),
  ).resolves.toBeTruthy();
});
