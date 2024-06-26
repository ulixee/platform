import * as Fs from 'fs';
import * as Path from 'path';
import DatastorePackager from '@ulixee/datastore-packager';
import { CloudNode } from '@ulixee/cloud';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { Helpers } from '@ulixee/datastore-testing';
import { string } from 'zod';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'PassthroughTable.test');

let cloudNode: CloudNode;
let client: DatastoreApiClient;
let remoteVersion: string;
let remoteDatastoreId: string;
beforeAll(async () => {
  for (const file of [
    'remoteTable.dbx',
    'passthroughTable.js',
    'passthroughTable.dbx',
    'passthroughTable2.dbx',
  ]) {
    if (Fs.existsSync(`${__dirname}/datastores/${file}`)) {
      await Fs.promises.rm(`${__dirname}/datastores/${file}`, { recursive: true });
    }
  }

  cloudNode = await Helpers.createLocalNode(
    {
      datastoreConfiguration: {
        datastoresDir: storageDir,
      },
    },
    true,
  );
  client = new DatastoreApiClient(await cloudNode.address);
  Helpers.onClose(() => client.disconnect(), true);

  const packager = new DatastorePackager(`${__dirname}/datastores/remoteTable.js`);
  await packager.build();
  await client.upload(await packager.dbx.tarGzip());
  remoteVersion = packager.manifest.version;
  remoteDatastoreId = packager.manifest.id;
});
afterEach(Helpers.afterEach);

afterAll(async () => {
  await Helpers.afterAll();
});

test('should be able to have a passthrough table', async () => {
  await expect(
    client.query(remoteDatastoreId, remoteVersion, 'select * from remote', { queryId: '1' }),
  ).resolves.toEqual({
    latestVersion: remoteVersion,
    metadata: expect.any(Object),
    queryId: '1',
    outputs: [
      { title: 'Hello', success: true },
      { title: 'World', success: false },
    ],
  });

  Fs.writeFileSync(
    `${__dirname}/datastores/passthroughTable.js`,
    `const Datastore = require('@ulixee/datastore');
const { boolean, string } = require('@ulixee/schema');

export default new Datastore({
  remoteDatastores: {
    source: 'ulx://${await cloudNode.address}/${remoteDatastoreId}@v${remoteVersion}',
  },
  tables: {
    pass: new Datastore.PassthroughTable({
      remoteTable: 'source.remote',
      schema: {
        title: string(),
        success: boolean(),
      },
    }),
  },
});`,
  );

  const passthrough = new DatastorePackager(`${__dirname}/datastores/passthroughTable.js`);
  await passthrough.build({ createTemporaryVersion: true });
  await client.upload(await passthrough.dbx.tarGzip());

  await expect(
    client.query(passthrough.manifest.id, passthrough.manifest.version, 'select * from pass'),
  ).resolves.toEqual({
    latestVersion: passthrough.manifest.version,
    metadata: expect.any(Object),
    outputs: [
      { title: 'Hello', success: true },
      { title: 'World', success: false },
    ],
    queryId: expect.any(String),
  });
});

test('can join a passthrough table with a local', async () => {
  Fs.writeFileSync(
    `${__dirname}/datastores/passthroughTable2.js`,
    `const Datastore = require('@ulixee/datastore');
const { boolean, string } = require('@ulixee/schema');

export default new Datastore({
  remoteDatastores: {
    source: 'ulx://${await cloudNode.address}/${remoteDatastoreId}@v${remoteVersion}',
  },
  tables: {
    pass: new Datastore.PassthroughTable({
      remoteTable: 'source.remote',
      schema: {
        title: string(),
        success: boolean(),
      },
    }),
    local: new Datastore.Table({
      schema: {
        name: string(),
        title: string(),
      },
      onCreated() {
        return this.insertInternal({ title: 'Hello', name: 'World' }, { title: 'World', name: 'none' })
      }
    }),
  },
});`,
  );

  const passthrough = new DatastorePackager(`${__dirname}/datastores/passthroughTable2.js`);
  await passthrough.build({ createTemporaryVersion: true });
  await client.upload(await passthrough.dbx.tarGzip());

  await expect(
    client.query(
      passthrough.manifest.id,
      passthrough.manifest.version,
      'select local.* from pass join local on local.title = pass.title where pass.success = $1',
      { boundValues: [true] },
    ),
  ).resolves.toEqual({
    latestVersion: passthrough.manifest.version,
    metadata: expect.any(Object),
    outputs: [{ title: 'Hello', name: 'World' }],
    queryId: expect.any(String),
  });
});
