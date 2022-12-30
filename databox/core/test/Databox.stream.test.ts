import * as Fs from 'fs';
import * as Path from 'path';
import DataboxPackager from '@ulixee/databox-packager';
import UlixeeMiner from '@ulixee/miner';
import Identity from '@ulixee/crypto/lib/Identity';
import DataboxApiClient from '@ulixee/databox/lib/DataboxApiClient';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Databox.stream.test');
let miner: UlixeeMiner;
let client: DataboxApiClient;

beforeAll(async () => {
  miner = new UlixeeMiner();
  miner.router.databoxConfiguration = { databoxesDir: storageDir };
  await miner.listen();
  client = new DataboxApiClient(await miner.address);
});

afterAll(async () => {
  await miner.close();
  if (Fs.existsSync(storageDir)) Fs.rmSync(storageDir, { recursive: true });
});

test('should be able to stream a databox function', async () => {
  const packager = new DataboxPackager(`${__dirname}/databoxes/stream.js`);
  await packager.build();
  await client.upload(await packager.dbx.asBuffer());
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

test('should be able to require authentication for a streamed function', async () => {
  const id = Identity.createSync();
  Fs.writeFileSync(
    `${__dirname}/databoxes/streamedAuth.js`,
    Fs.readFileSync(`${__dirname}/databoxes/streamedAuth.js`, 'utf8').replace(
      /const allowedId = 'id1.+';/,
      `const allowedId = '${id.bech32}';`,
    ),
  );

  const packager = new DataboxPackager(`${__dirname}/databoxes/streamedAuth.js`);
  await packager.build();
  await client.upload(await packager.dbx.asBuffer());
  const auth = DataboxApiClient.createExecAuthentication(null, id);
  await expect(client.stream(packager.manifest.versionHash, 'authme', {})).rejects.toThrowError(
    'authentication',
  );

  await expect(
    client.stream(packager.manifest.versionHash, 'authme', {}, { authentication: auth }),
  ).resolves.toBeTruthy();
});
