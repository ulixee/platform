"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const datastore_packager_1 = require("@ulixee/datastore-packager");
const datastore_testing_1 = require("@ulixee/datastore-testing");
// eslint-disable-next-line import/no-extraneous-dependencies
const DatastoreApiClient_1 = require("@ulixee/datastore/lib/DatastoreApiClient");
const Fs = require("fs");
const Path = require("path");
datastore_testing_1.Helpers.blockGlobalConfigWrites();
const datastoresDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'ReplayRegistry.test');
let server;
beforeAll(async () => {
    server = await datastore_testing_1.Helpers.runKoaServer();
});
afterAll(datastore_testing_1.Helpers.afterAll);
afterEach(datastore_testing_1.Helpers.afterEach);
test('should get hero sessions from the registry', async () => {
    const storageNode = await datastore_testing_1.Helpers.createLocalNode({
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
    const childNode = await datastore_testing_1.Helpers.createLocalNode({
        datastoreConfiguration: {
            datastoresDir: Path.join(datastoresDir, '2'),
            queryHeroSessionsDir: Path.join(datastoresDir, '2', 'query'),
        },
        heroConfiguration: {
            dataDir: Path.join(datastoresDir, '2', 'hero'),
        },
        servicesSetupHost: await storageNode.hostedServicesServer.host,
    });
    const childNode2 = await datastore_testing_1.Helpers.createLocalNode({
        datastoreConfiguration: {
            datastoresDir: Path.join(datastoresDir, '3'),
            queryHeroSessionsDir: Path.join(datastoresDir, '3', 'query'),
        },
        heroConfiguration: {
            dataDir: Path.join(datastoresDir, '3', 'hero'),
        },
        servicesSetupHost: await storageNode.hostedServicesServer.host,
    });
    const packager = new datastore_packager_1.default(`${__dirname}/_heroDatastore.js`);
    await Fs.promises.writeFile(`${__dirname}/_heroDatastore-manifest.json`, JSON.stringify({
        storageEngineHost: await storageNode.host,
    }));
    await packager.build({ createTemporaryVersion: true });
    const client = new DatastoreApiClient_1.default(await childNode.address);
    datastore_testing_1.Helpers.onClose(() => client.disconnect());
    await client.upload(await packager.dbx.tarGzip());
    await expect(client.query(packager.manifest.id, packager.manifest.version, 'select * from getTitle(url => $1)', {
        boundValues: [server.baseUrl],
    })).resolves.toBeTruthy();
    expect(storageStoreSpy).toHaveBeenCalled(); // crawl + extractor
    expect(storageGetSpy).toHaveBeenCalledTimes(0);
    // client 2 should use the replay from the storage node
    const client2 = new DatastoreApiClient_1.default(await childNode2.address);
    datastore_testing_1.Helpers.onClose(() => client2.disconnect(), true);
    await expect(client2.query(packager.manifest.id, packager.manifest.version, 'select * from getTitle(url => $1)', {
        boundValues: [server.baseUrl],
    })).resolves.toBeTruthy();
    expect(storageGetSpy).toHaveBeenCalledTimes(1);
    await getPlugin(childNode2).replayRegistry.flush();
    await expect(getPlugin(storageNode).replayRegistry.ids()).resolves.toHaveLength(3);
}, 60e3);
function getPlugin(node) {
    return node.datastoreCore.pluginCoresByName['@ulixee/datastore-plugins-hero'];
}
//# sourceMappingURL=ReplayRegistry.test.js.map