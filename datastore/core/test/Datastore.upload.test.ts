import * as Fs from 'fs';
import * as Path from 'path';
import DatastorePackager from '@ulixee/datastore-packager';
import UlixeeMiner from '@ulixee/miner';
import IDatastoreManifest from '@ulixee/specification/types/IDatastoreManifest';
import Identity from '@ulixee/crypto/lib/Identity';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import DatastoreCore from '../index';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Datastore.upload.test');

let dbxFile: Buffer;
let manifest: IDatastoreManifest;
let miner: UlixeeMiner;
let client: DatastoreApiClient;

beforeAll(async () => {
  jest.spyOn<any, any>(UlixeeHostsConfig.global, 'save').mockImplementation(() => null);
  const packager = new DatastorePackager(`${__dirname}/datastores/upload.js`);
  await packager.build();
  dbxFile = await packager.dbx.asBuffer();
  manifest = packager.manifest.toJSON();
  miner = new UlixeeMiner();
  miner.router.datastoreConfiguration = { datastoresDir: storageDir };
  await miner.listen();
  client = new DatastoreApiClient(await miner.address);
});

afterAll(async () => {
  await miner?.close();
  if (Fs.existsSync(storageDir)) {
    if (Fs.existsSync(storageDir)) Fs.rmSync(storageDir, { recursive: true });
  }
});

test('should be able upload a datastore', async () => {
  try {
  await client.upload(dbxFile);
  expect(Fs.existsSync(storageDir)).toBeTruthy();
  expect(manifest.schemaInterface).toBe(`{
  upTest: {
    output: {
      /**
       * Whether or not this test succeeded
       */
      upload: boolean;
    };
  };
}`)
  expect(Fs.existsSync(`${storageDir}/upload@${manifest.versionHash}.dbx`)).toBeTruthy();
} catch (error) {
  console.log('TEST ERROR: ', error);
  throw error;
}
});

test('should be able to restrict uploads', async () => {
  const identity = await Identity.create();
  DatastoreCore.options.uploaderIdentities = [identity.bech32];

  await expect(client.upload(dbxFile)).rejects.toThrowError(
    'Identity is not approved',
  );
  await expect(client.upload(dbxFile, { identity })).resolves.toBeTruthy();
});
