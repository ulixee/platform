import * as Fs from 'fs';
import * as Path from 'path';
import DatastorePackager from '@ulixee/datastore-packager';
import UlixeeMiner from '@ulixee/miner';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import cloneDatastore from "@ulixee/datastore/cli/cloneDatastore";

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Datastore.clone.test');

let miner: UlixeeMiner;
let client: DatastoreApiClient;

beforeAll(async () => {
  if (Fs.existsSync(`${__dirname}/datastores/cloneme.dbx`)) {
    Fs.unlinkSync(`${__dirname}/datastores/cloneme.dbx`);
  }

  if (Fs.existsSync(`${__dirname}/datastores/cloned.dbx`)) {
    Fs.unlinkSync(`${__dirname}/datastores/cloned.dbx`);
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

test('should be able to clone a datastore', async () => {
  let versionHash: string;
  {
    const packager = new DatastorePackager(`${__dirname}/datastores/cloneme.ts`);
    await packager.build();
    await client.upload(await packager.dbx.asBuffer());
    versionHash = packager.manifest.versionHash;
  }

  const url = `ulx://${await miner.address}/${versionHash}`;
  await expect(cloneDatastore(url, `${__dirname}/datastores/cloned.ts`)).resolves.toBeUndefined();

  expect(Fs.existsSync(`${__dirname}/datastores/cloned.ts`)).toBeTruthy();
  const packager = new DatastorePackager(`${__dirname}/datastores/cloned.ts`);
  await packager.build();
  await client.upload(await packager.dbx.asBuffer());

  await expect(
    client.stream(packager.manifest.versionHash, 'cloneUpstream', {}),
  ).rejects.toThrowError('input');

  await expect(
    client.stream(packager.manifest.versionHash, 'cloneUpstream', {
      field: 'str',
      nested: { field2: true },
    }),
  ).resolves.toEqual([{ success: true }]);
});
