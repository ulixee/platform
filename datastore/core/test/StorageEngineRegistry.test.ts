import DatastorePackager from '@ulixee/datastore-packager';
import { Helpers } from '@ulixee/datastore-testing';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import * as Fs from 'fs';
import * as Path from 'path';

Helpers.blockGlobalConfigWrites();
const datastoresDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'StorageEngineRegistry.test');

beforeAll(async () => {
  await Fs.promises.rm(`${__dirname}/datastores/remoteStorage-manifest.json`).catch(() => null);
  await Fs.promises
    .rm(`${__dirname}/datastores/migrator.dbx`, { recursive: true })
    .catch(() => null);
}, 60e3);

afterAll(async () => Helpers.afterAll());

afterEach(Helpers.afterEach);

test('should run migrations on start', async () => {
  const cloudNode = await Helpers.createLocalNode({
    datastoresDir,
  });
  const client = new DatastoreApiClient(await cloudNode.address);
  Helpers.onClose(() => client.disconnect());

  const path = Path.join(__dirname, 'datastores', 'migrator.ts');
  await Fs.promises.writeFile(
    path,
    `import Datastore, { Table } from '@ulixee/datastore';
import { boolean, string } from '@ulixee/schema';

export default new Datastore({
  tables: {
   migrator: new Table({
    schema: {
      title: string(),
      success: boolean(),
    },
   }),
  },
  async onCreated() {
    await this.tables.migrator.insertInternal(
      { title: 'Hello', success: true },
      { title: 'World', success: false },
    );
  },
});
`,
    'utf8',
  );

  const packager = new DatastorePackager(`${__dirname}/datastores/migrator.ts`);
  await packager.build();
  await client.upload(await packager.dbx.tarGzip());

  // @ts-expect-error
  const datastoresDb = cloudNode.datastoreCore.datastoreRegistry.diskStore.datastoresDb;

  await expect(
    client.stream(packager.manifest.versionHash, 'migrator', { success: false }),
  ).resolves.toEqual([{ title: 'World', success: false }]);

  await Fs.promises.writeFile(
    path,
    `import Datastore, { Table } from '@ulixee/datastore';
import { boolean, string } from '@ulixee/schema';

export default new Datastore({
  tables: {
   migrator: new Table({
    schema: {
      title: string(),
      newColumn: string({ enum: ['not', 'ought'] }),
      success: boolean(),
    },
   }),
  },
  async onVersionMigrated(prev) {
    const records = await prev.tables.migrator.fetchInternal();
    await this.tables.migrator.insertInternal(
      ...records.map(x => ({
        ...x,
        newColumn: x.success ? 'not' : 'ought',
      })),
    );
  },
});
`,
    'utf8',
  );

  await packager.build();
  await client.upload(await packager.dbx.tarGzip());

  const datastores2 = datastoresDb.versions.all();
  expect(datastores2).toHaveLength(2);

  await expect(
    client.stream(packager.manifest.versionHash, 'migrator', { success: false }),
  ).resolves.toEqual([{ title: 'World', newColumn: 'ought', success: false }]);
}, 45e3);

test('should require uploaded datastores to have a storage engine endpoint if configured', async () => {
  // force cloud node to host
  const storageNode = await Helpers.createLocalNode({
    storageEngineHost: 'localhost:1818/notreal',
    datastoresDir,
  });
  Helpers.needsClosing.push(storageNode);
  await Fs.promises.rm(`${__dirname}/datastores/remoteStorage-manifest.json`).catch(() => null);
  await Fs.promises
    .rm(`${__dirname}/datastores/remoteStorage.dbx`, { recursive: true })
    .catch(() => null);
  const packager = new DatastorePackager(`${__dirname}/datastores/remoteStorage.ts`);
  await packager.build();
  expect(packager.manifest.storageEngineHost).not.toBeTruthy();
  const newClient = new DatastoreApiClient(await storageNode.address);
  Helpers.onClose(() => newClient.disconnect());
  await expect(newClient.upload(await packager.dbx.tarGzip())).rejects.toThrowError(
    'storage engine host',
  );
});

test('should be able to use a remote storage engine endpoint', async () => {
  // force cloud node to host
  const storageHostNode = await Helpers.createLocalNode({
    datastoresDir,
  });

  const clusterNode = await Helpers.createLocalNode({
    datastoresDir,
    storageEngineHost: await storageHostNode.host,
  });

  const storageNodeRegistrySpy = jest.spyOn(
    storageHostNode.datastoreCore.storageEngineRegistry,
    'get',
  );
  const clusterNodeRegistrySpy = jest.spyOn(
    storageHostNode.datastoreCore.storageEngineRegistry,
    'get',
  );

  await Fs.promises
    .rm(`${__dirname}/datastores/remoteStorage.dbx`, { recursive: true })
    .catch(() => null);
  await Fs.promises.writeFile(
    `${__dirname}/datastores/remoteStorage-manifest.json`,
    JSON.stringify({
      storageEngineHost: await storageHostNode.host,
    }),
  );
  const packager = new DatastorePackager(`${__dirname}/datastores/remoteStorage.ts`);
  await packager.build();
  const client = new DatastoreApiClient(await clusterNode.host);
  Helpers.onClose(() => client.disconnect());

  await expect(client.upload(await packager.dbx.tarGzip())).resolves.toBeTruthy();
  expect(storageNodeRegistrySpy).toHaveBeenCalledTimes(1);
  expect(clusterNodeRegistrySpy).toHaveBeenCalledTimes(1);

  await expect(
    client.query(packager.manifest.versionHash, 'select * from intro where visible=true', {}),
  ).resolves.toEqual({
    outputs: [{ title: 'Hello', visible: true }],
    metadata: expect.any(Object),
    latestVersionHash: expect.any(String),
  });

  expect(storageNodeRegistrySpy).toHaveBeenCalledTimes(2);
  expect(clusterNodeRegistrySpy).toHaveBeenCalledTimes(2);
}, 45e3);
