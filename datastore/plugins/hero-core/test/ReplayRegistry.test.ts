// eslint-disable-next-line import/no-extraneous-dependencies
import { CloudNode } from '@ulixee/cloud';
import DatastorePackager from '@ulixee/datastore-packager';
import { Helpers } from '@ulixee/datastore-testing';
import { ITestKoaServer } from '@ulixee/datastore-testing/helpers';
// eslint-disable-next-line import/no-extraneous-dependencies
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import * as Fs from 'fs';
import * as Path from 'path';
import DatastoreForHeroPluginCore from '../index';

Helpers.blockGlobalConfigWrites();
const datastoresDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'ReplayRegistry.test');
let server: ITestKoaServer;
beforeAll(async () => {
  server = await Helpers.runKoaServer();
});

afterAll(Helpers.afterAll);
afterEach(Helpers.afterEach);

test('should get hero sessions from the registry', async () => {
  const storageNode = await Helpers.createLocalNode({
    datastoreConfiguration: {
      datastoresDir: Path.join(datastoresDir, '1'),
      queryHeroSessionsDir: Path.join(datastoresDir, '1', 'query'),
      replayRegistryHost: 'self',
    },
    heroConfiguration: {
      dataDir: Path.join(datastoresDir, '1', 'hero'),
    },
    hostedServicesServerOptions: { port: 0 },
  });
  const heroPluginCore = getPlugin(storageNode);
  const storageStoreSpy = jest.spyOn(heroPluginCore.replayRegistry.replayStorageRegistry, 'store');
  const storageGetSpy = jest.spyOn(heroPluginCore.replayRegistry.replayStorageRegistry, 'get');

  const childNode = await Helpers.createLocalNode({
    datastoreConfiguration: {
      datastoresDir: Path.join(datastoresDir, '2'),
      queryHeroSessionsDir: Path.join(datastoresDir, '2', 'query'),
    },
    heroConfiguration: {
      dataDir: Path.join(datastoresDir, '2', 'hero'),
    },
    servicesSetupHost: await storageNode.hostedServicesServer.host,
  });

  const childNode2 = await Helpers.createLocalNode({
    datastoreConfiguration: {
      datastoresDir: Path.join(datastoresDir, '3'),
      queryHeroSessionsDir: Path.join(datastoresDir, '3', 'query'),
    },
    heroConfiguration: {
      dataDir: Path.join(datastoresDir, '3', 'hero'),
    },
    servicesSetupHost: await storageNode.hostedServicesServer.host,
  });

  const packager = new DatastorePackager(`${__dirname}/_heroDatastore.js`);
  await Fs.promises.writeFile(
    `${__dirname}/_heroDatastore-manifest.json`,
    JSON.stringify({
      storageEngineHost: await storageNode.host,
    }),
  );
  await packager.build({ createTemporaryVersion: true });

  const client = new DatastoreApiClient(await childNode.address);
  Helpers.onClose(() => client.disconnect());
  await client.upload(await packager.dbx.tarGzip());

  await expect(
    client.query(
      packager.manifest.id,
      packager.manifest.version,
      'select * from getTitle(url => $1)',
      {
        boundValues: [server.baseUrl],
      },
    ),
  ).resolves.toBeTruthy();
  expect(storageStoreSpy).toHaveBeenCalled(); // crawl + extractor
  expect(storageGetSpy).toHaveBeenCalledTimes(0);

  // client 2 should use the replay from the storage node
  const client2 = new DatastoreApiClient(await childNode2.address);
  Helpers.onClose(() => client2.disconnect(), true);

  await expect(
    client2.query(
      packager.manifest.id,
      packager.manifest.version,
      'select * from getTitle(url => $1)',
      {
        boundValues: [server.baseUrl],
      },
    ),
  ).resolves.toBeTruthy();
  expect(storageGetSpy).toHaveBeenCalledTimes(1);

  await getPlugin(childNode2).replayRegistry.flush();

  await expect(getPlugin(storageNode).replayRegistry.ids()).resolves.toHaveLength(3);
}, 60e3);

function getPlugin(node: CloudNode): DatastoreForHeroPluginCore {
  return node.datastoreCore.pluginCoresByName[
    '@ulixee/datastore-plugins-hero'
  ] as DatastoreForHeroPluginCore;
}
