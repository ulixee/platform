// eslint-disable-next-line import/no-extraneous-dependencies
import { CloudNode } from '@ulixee/cloud';
import DatastorePackager from '@ulixee/datastore-packager';
import { Helpers } from '@ulixee/datastore-testing';
import { ITestKoaServer } from '@ulixee/datastore-testing/helpers';
// eslint-disable-next-line import/no-extraneous-dependencies
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import Hero, { ConnectionToHeroCore } from '@ulixee/hero';
import { TransportBridge } from '@ulixee/net';
import * as Fs from 'fs';
import { existsSync } from 'fs';
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
  const storageDeleteSpy = jest.spyOn(
    heroPluginCore.replayRegistry.replayStorageRegistry,
    'delete',
  );

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
  expect(storageStoreSpy).toHaveBeenCalledTimes(1);

  await getPlugin(childNode2).replayRegistry.flush();

  // should only cache the actual crawl
  await expect(getPlugin(storageNode).replayRegistry.ids()).resolves.toHaveLength(1);
  expect(storageDeleteSpy).toHaveBeenCalledTimes(0);
  const oldSessionId = (await getPlugin(storageNode).replayRegistry.ids())[0];

  // now if we run with max time in cache 0, it should run the crawl again and evict the old one
  await expect(
    client2.query(
      packager.manifest.id,
      packager.manifest.version,
      'select * from getTitle(url => $1, maxTimeInCache => 0)',
      {
        boundValues: [server.baseUrl],
      },
    ),
  ).resolves.toBeTruthy();
  expect(storageDeleteSpy).toHaveBeenCalledTimes(1);
  expect(storageStoreSpy).toHaveBeenCalledTimes(2);
  await expect(getPlugin(storageNode).replayRegistry.ids()).resolves.toHaveLength(1);
  const newSessionId = (await getPlugin(storageNode).replayRegistry.ids())[0];
  expect(newSessionId).not.toBe(oldSessionId);
}, 60e3);

test('allows you to delete hero sessions if desktop is enabled', async () => {
  const childNode = await Helpers.createLocalNode({
    disableDesktopCore: false,
    datastoreConfiguration: {
      datastoresDir: Path.join(datastoresDir, 'delete'),
      queryHeroSessionsDir: Path.join(datastoresDir, 'delete', 'query'),
    },
    heroConfiguration: {
      dataDir: Path.join(datastoresDir, 'delete', 'hero'),
    },
  });

  const bridge = new TransportBridge();
  const connectionToCore = new ConnectionToHeroCore(bridge.transportToCore);
  childNode.heroCore.addConnection(bridge.transportToClient);

  const hero = new Hero({
    connectionToCore,
    sessionPersistence: false,
  });
  const meta = await hero.meta;
  Helpers.needsClosing.push(hero);
  expect(await childNode.heroCore.sessionRegistry.ids()).toHaveLength(1);
  const session = await childNode.heroCore.sessionRegistry.get(meta.sessionId);
  expect(childNode.desktopCore.sessionControllersById.size).toBe(0);

  await hero.goto(server.baseUrl);
  await hero.waitForLoad('AllContentLoaded');
  await hero.close();

  await expect(childNode.heroCore.sessionRegistry.get(meta.sessionId)).resolves.toBe(undefined);
  expect(await childNode.heroCore.sessionRegistry.ids()).toHaveLength(0);
  expect(childNode.desktopCore.sessionControllersById.size).toBe(0);
  expect(existsSync(session.path)).toBe(false);
}, 60e3);

function getPlugin(node: CloudNode): DatastoreForHeroPluginCore {
  return node.datastoreCore.pluginCoresByName[
    '@ulixee/datastore-plugins-hero'
  ] as DatastoreForHeroPluginCore;
}
