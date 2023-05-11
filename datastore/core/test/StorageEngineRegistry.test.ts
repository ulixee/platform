import * as Fs from 'fs';
import { mkdirSync, rmSync } from 'fs';
import * as Path from 'path';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { CloudNode } from '@ulixee/cloud';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import DatastorePackager from '@ulixee/datastore-packager';
import UlixeeConfig from '@ulixee/commons/config';
import DatastoreManifest from '../lib/DatastoreManifest';
import DatastoreCore from '../index';

jest.spyOn<any, any>(UlixeeHostsConfig.global, 'save').mockImplementation(() => null);
// @ts-expect-error
const write = DatastoreManifest.writeToDisk;
// @ts-expect-error
jest.spyOn(DatastoreManifest, 'writeToDisk').mockImplementation(async (path, data) => {
  if (path.includes(UlixeeConfig.global.directoryPath)) return;
  return write.call(DatastoreManifest, path, data);
});

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'StorageEngineRegistry.test');
const tmpDir = `${storageDir}/tmp`;
let cloudNode: CloudNode;
let client: DatastoreApiClient;

beforeAll(async () => {
  try {
    rmSync(storageDir, { recursive: true });
  } catch (err) {}
  mkdirSync(storageDir, { recursive: true });
  await Fs.promises
    .rm(`${__dirname}/datastores/migrator.dbx`, { recursive: true })
    .catch(() => null);
  DatastoreCore.options.datastoresTmpDir = tmpDir;
  DatastoreCore.options.datastoresDir = storageDir;
  cloudNode = new CloudNode();
  cloudNode.router.datastoreConfiguration = {
    datastoresDir: storageDir,
    datastoresTmpDir: tmpDir,
  };
  await cloudNode.listen();
  client = new DatastoreApiClient(await cloudNode.address);
}, 60e3);

afterAll(async () => {
  await cloudNode.close();
  await client.disconnect();
  try {
    rmSync(storageDir, { recursive: true });
  } catch (err) {}
});

test('should run migrations on start', async () => {
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
  const datastoresDb = DatastoreCore.datastoreRegistry.diskStore.datastoresDb;

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
