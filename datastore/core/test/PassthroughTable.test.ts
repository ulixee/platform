import * as Fs from 'fs';
import * as Path from 'path';
import DatastorePackager from '@ulixee/datastore-packager';
import { CloudNode } from '@ulixee/cloud';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { Helpers } from '@ulixee/datastore-testing';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'PassthroughTable.test');

let cloudNode: CloudNode;
let client: DatastoreApiClient;
let remoteVersionHash: string;
beforeAll(async () => {
  for (const file of ['remoteTable.dbx', 'passthroughTable.js', 'passthroughTable.dbx', 'passthroughTable2.dbx']) {
    if (Fs.existsSync(`${__dirname}/datastores/${file}`)) {
      await Fs.promises.rm(`${__dirname}/datastores/${file}`, { recursive: true });
    }
  }

  cloudNode = new CloudNode();
  cloudNode.router.datastoreConfiguration = {
    datastoresDir: storageDir,
    datastoresTmpDir: Path.join(storageDir, 'tmp'),
  };
  await cloudNode.listen();
  client = new DatastoreApiClient(await cloudNode.address);

  const packager = new DatastorePackager(`${__dirname}/datastores/remoteTable.js`);
  await packager.build();
  await client.upload(await packager.dbx.tarGzip());
  remoteVersionHash = packager.manifest.versionHash;
});
afterEach(Helpers.afterEach);

afterAll(async () => {
  await cloudNode?.close();
  await Helpers.afterAll();
  Fs.rmSync(storageDir, { recursive: true });
});

test('should be able to have a passthrough table', async () => {
  await expect(client.query(remoteVersionHash, 'select * from remote')).resolves.toEqual({
    latestVersionHash: remoteVersionHash,
    metadata: expect.any(Object),
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
    source: 'ulx://${await cloudNode.address}/${remoteVersionHash}',
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
  await passthrough.build();
  await client.upload(await passthrough.dbx.tarGzip());

  await expect(
    client.query(passthrough.manifest.versionHash, 'select * from pass'),
  ).resolves.toEqual({
    latestVersionHash: passthrough.manifest.versionHash,
    metadata: expect.any(Object),
    outputs: [
      { title: 'Hello', success: true },
      { title: 'World', success: false },
    ],
  });
});

test('can join a passthrough table with a local', async () => {
  Fs.writeFileSync(
    `${__dirname}/datastores/passthroughTable2.js`,
    `const Datastore = require('@ulixee/datastore');
const { boolean, string } = require('@ulixee/schema');

export default new Datastore({
  remoteDatastores: {
    source: 'ulx://${await cloudNode.address}/${remoteVersionHash}',
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
  await passthrough.build();
  await client.upload(await passthrough.dbx.tarGzip());

  await expect(
    client.query(
      passthrough.manifest.versionHash,
      'select local.* from pass join local on local.title = pass.title where pass.success = $1',
      { boundValues: [true] },
    ),
  ).resolves.toEqual({
    latestVersionHash: passthrough.manifest.versionHash,
    metadata: expect.any(Object),
    outputs: [{ title: 'Hello', name: 'World' }],
  });
});
