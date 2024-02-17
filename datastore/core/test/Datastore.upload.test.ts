import { CloudNode } from '@ulixee/cloud';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import Identity from '@ulixee/platform-utils/lib/Identity';
import DatastorePackager from '@ulixee/datastore-packager';
import { Helpers } from '@ulixee/datastore-testing';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import * as Fs from 'fs';
import * as Path from 'path';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Datastore.upload.test');

let dbxFile: Buffer;
let packager: DatastorePackager;
let manifest: IDatastoreManifest;
let cloudNode: CloudNode;
let client: DatastoreApiClient;

beforeAll(async () => {
  jest.spyOn<any, any>(UlixeeHostsConfig.global, 'save').mockImplementation(() => null);
  if (Fs.existsSync(`${__dirname}/datastores/upload-manifest.json`)) {
    Fs.unlinkSync(`${__dirname}/datastores/upload-manifest.json`);
  }
  packager = new DatastorePackager(`${__dirname}/datastores/upload.js`);
  cloudNode = await Helpers.createLocalNode(
    {
      datastoreConfiguration: {
        datastoresDir: storageDir,
        datastoresTmpDir: Path.join(storageDir, 'tmp'),
      },
    },
    true,
  );
  await Fs.promises.writeFile(
    `${__dirname}/datastores/upload-manifest.json`,
    JSON.stringify({
      version: '0.0.1',
    } as Partial<IDatastoreManifest>),
  );
  const dbx = await packager.build();
  dbxFile = await dbx.tarGzip();
  manifest = packager.manifest.toJSON();
  client = new DatastoreApiClient(await cloudNode.address, { consoleLogErrors: true });
  Helpers.onClose(() => client.disconnect(), true);
});

afterEach(Helpers.afterEach);
afterAll(Helpers.afterAll);

test('should be able upload a datastore', async () => {
  try {
    await client.upload(dbxFile);
    expect(Fs.existsSync(storageDir)).toBeTruthy();
    expect(manifest.schemaInterface).toBe(`{
  tables: {};
  extractors: {
    upTest: {
      output: {
        /**
         * Whether or not this test succeeded
         */
        upload: boolean;
      };
    };
  };
  crawlers: {};
}`);
    expect(
      Fs.existsSync(`${storageDir}/${manifest.id}@${manifest.version}.dbx`),
    ).toBeTruthy();
  } catch (error) {
    console.log('TEST ERROR: ', error);
    throw error;
  }
});

test('should be able to restrict uploads', async () => {
  const identity = await Identity.create();
  cloudNode.datastoreCore.options.cloudAdminIdentities = [identity.bech32];
  await Fs.promises.writeFile(
    `${__dirname}/datastores/upload-manifest.json`,
    JSON.stringify({
      version: '0.0.2',
    } as Partial<IDatastoreManifest>),
  );
  const dbx = await packager.build();
  dbxFile = await dbx.tarGzip();
  manifest = packager.manifest.toJSON();
  await expect(client.upload(dbxFile)).rejects.toThrow('valid AdminIdentity signature');
  await expect(client.upload(dbxFile, { identity })).resolves.toBeTruthy();
});

test('should be able to download dbx files', async () => {
  const identity = await Identity.create();
  cloudNode.datastoreCore.options.cloudAdminIdentities = [identity.bech32];

  const wrongIdentity = await Identity.create();
  await expect(
    client.download(manifest.id, manifest.version, wrongIdentity),
  ).rejects.toThrow('Admin Identity does not have permissions');
  await expect(
    client.download(manifest.id, manifest.version, identity),
  ).resolves.toBeTruthy();
});
