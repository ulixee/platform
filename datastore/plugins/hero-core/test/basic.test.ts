import * as Fs from 'fs';
import { CloudNode } from '@ulixee/cloud';
import { Helpers } from '@ulixee/datastore-testing';
import DatastoreCore from '@ulixee/datastore-core';
import Packager from '@ulixee/datastore-packager';
import { ConnectionToDatastoreCore } from '@ulixee/datastore';
import * as Path from 'path';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'hero-core/basic.test');

let cloudNode: CloudNode;
let koaServer: Helpers.ITestKoaServer;
beforeAll(async () => {
  cloudNode = new CloudNode();
  cloudNode.router.datastoreConfiguration = {
    datastoresDir: storageDir,
    datastoresTmpDir: Path.join(storageDir, 'tmp'),
  };
  Helpers.onClose(() => cloudNode.close(), true);
  koaServer = await Helpers.runKoaServer();
  await cloudNode.listen(null, false);
});
afterAll(Helpers.afterAll);

test('it should be able to upload a datastore and run it by hash', async () => {
  if (Fs.existsSync(`${__dirname}/_testDatastore.dbx`))
    await Fs.promises.rm(`${__dirname}/_testDatastore.dbx`, { recursive: true });
  const packager = new Packager(require.resolve('./_testDatastore.js'));
  const dbx = await packager.build();
  const host = await cloudNode.address;
  await dbx.upload(host);
  // @ts-expect-error
  const registry = DatastoreCore.datastoreRegistry;
  // @ts-expect-error
  const { queryLogDb, datastoresDb } = registry;

  const manifest = packager.manifest;
  koaServer.get('/datastore', ctx => {
    ctx.body = `<html><head><title>Datastore!</title></head></html>`;
  });
  const remoteTransport = ConnectionToDatastoreCore.remote(host);
  Helpers.onClose(() => remoteTransport.disconnect());

  await expect(
    remoteTransport.sendRequest({
      command: 'Datastore.query',
      args: [
        {
          id: '1',
          sql: 'SELECT title FROM default(url => $1)',
          boundValues: [`${koaServer.baseUrl}/datastore`],
          versionHash: manifest.versionHash,
        },
      ],
    }),
  ).resolves.toEqual({
    metadata: expect.any(Object),
    outputs: [{ title: 'Datastore!' }],
    latestVersionHash: manifest.versionHash,
  });

  expect(queryLogDb.logTable.all()).toHaveLength(1);
  expect(queryLogDb.logTable.all()[0].query).toBe(`SELECT title FROM default(url => $1)`);
  expect(queryLogDb.logTable.all()[0].heroSessionIds.split(',')).toHaveLength(2);
  const stats = datastoresDb.datastoreItemStats.all();
  expect(stats).toHaveLength(2);
  expect(stats.some(x => x.name === 'default')).toBeTruthy();
  expect(stats.some(x => x.name === 'defaultCrawl')).toBeTruthy();
}, 45e3);

test('it should throw an error if the default export is not a datastore', async () => {
  const packager = new Packager(require.resolve('./_testDatastore2.js'));
  await expect(packager.build()).rejects.toThrow('Datastore must specify a coreVersion');
}, 45e3);
