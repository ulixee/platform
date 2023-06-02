import { CloudNode } from '@ulixee/cloud';
import DatastorePackager from '@ulixee/datastore-packager';
import { Helpers } from '@ulixee/datastore-testing';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import * as Fs from 'fs';
import * as Path from 'path';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'DatastoreRegistryService.test');

let nodeOutsideCluster: CloudNode;

let plainNode: CloudNode;
let nodeWithServices: CloudNode;
let client: DatastoreApiClient;
let packager: DatastorePackager;

beforeAll(async () => {
  nodeWithServices = await Helpers.createLocalNode(
    {
      cloudType: 'public', // Turning on so that download are enabled... eventually uses payment
      datastoreConfiguration: {
        datastoresDir: Path.join(storageDir, 'with-services'),
      },
      hostedServicesServerOptions: { port: 0 },
      kadEnabled: true,
    },
    true,
  );
  plainNode = await Helpers.createLocalNode(
    {
      datastoreConfiguration: {
        datastoresDir: Path.join(storageDir, 'plain'),
      },
      servicesSetupHost: await nodeWithServices.hostedServicesServer.host,
    },
    true,
  );

  nodeOutsideCluster = await Helpers.createLocalNode(
    {
      datastoreConfiguration: {
        datastoresDir: Path.join(storageDir, 'outside'),
      },
      kadBootstrapPeers: [nodeWithServices.kad.nodeHost],
      kadEnabled: true,
    },
    true,
  );

  client = new DatastoreApiClient(await plainNode.address);
  Fs.writeFileSync(
    `${__dirname}/datastores/DatastoreRegistryService1-manifest.json`,
    JSON.stringify({ storageEngineHost: await nodeWithServices.host }),
  );
  await Fs.promises
    .rm(`${__dirname}/datastores/DatastoreRegistryService1.dbx`, { recursive: true })
    .catch(() => null);
  packager = new DatastorePackager(`${__dirname}/datastores/DatastoreRegistryService1.js`);
  await packager.build();
  Helpers.onClose(() => client.disconnect(), true);
}, 60e3);

afterAll(Helpers.afterAll);
afterEach(Helpers.afterEach);

test('should proxy datastore uploads to the registry owner', async () => {
  expect(plainNode.datastoreCore.options.datastoreRegistryHost).toContain(
    await nodeWithServices.hostedServicesServer.host,
  );
  const registryHomeSave = jest.spyOn(nodeWithServices.datastoreCore.datastoreRegistry, 'save');
  const dbxFile = await packager.dbx.tarGzip();
  await expect(client.upload(dbxFile)).resolves.toBeTruthy();
  expect(registryHomeSave).toHaveBeenCalledTimes(1);
});

test('should look for datastores in the hosted service', async () => {
  await packager.dbx.upload(await nodeWithServices.host);
  const clusterNodeGet = jest.spyOn(
    nodeWithServices.datastoreCore.datastoreRegistry,
    'getByVersionHash',
  );
  const plainNodeCheckCluster = jest.spyOn(
    plainNode.datastoreCore.datastoreRegistry.clusterStore,
    'get',
  );
  const plainNodeDownloadFromCluster = jest.spyOn(
    plainNode.datastoreCore.datastoreRegistry.clusterStore,
    'downloadDbx',
  );
  await expect(client.getMeta(packager.manifest.versionHash)).resolves.toBeTruthy();
  expect(clusterNodeGet).toHaveBeenCalled();
  expect(plainNodeCheckCluster).toHaveBeenCalledTimes(1);
  expect(plainNodeDownloadFromCluster).toHaveBeenCalledTimes(1);
});

test('should look in the peer network for a datastore', async () => {
  await packager.dbx.upload(await nodeWithServices.host);
  const externalNodeGet = jest.spyOn(
    nodeWithServices.datastoreCore.datastoreRegistry,
    'getByVersionHash',
  );
  const outsideNodeCheckNetwork = jest.spyOn(
    nodeOutsideCluster.datastoreCore.datastoreRegistry.networkStore,
    'get',
  );
  const outsideNodeDownload = jest.spyOn(
    nodeOutsideCluster.datastoreCore.datastoreRegistry.networkStore,
    'downloadDbx',
  );
  const outsideNodeClient = new DatastoreApiClient(await nodeOutsideCluster.host);
  Helpers.onClose(() => outsideNodeClient.disconnect());
  await expect(outsideNodeClient.getMeta(packager.manifest.versionHash)).resolves.toBeTruthy();
  expect(externalNodeGet).toHaveBeenCalled();
  expect(outsideNodeCheckNetwork).toHaveBeenCalledTimes(1);
  expect(outsideNodeDownload).toHaveBeenCalledTimes(1);
});

test('should expire datastores and be able to re-install them when needed', async () => {
  await packager.dbx.upload(await nodeWithServices.host);
  const outsideNodeClient = new DatastoreApiClient(await nodeOutsideCluster.host);
  Helpers.onClose(() => outsideNodeClient.disconnect());
  const versionHash = packager.manifest.versionHash;
  await expect(outsideNodeClient.getMeta(versionHash)).resolves.toBeTruthy();
  const onExpire = jest.spyOn(
    nodeOutsideCluster.datastoreCore.datastoreRegistry.diskStore,
    'didExpireNetworkHosting',
  );

  // should be able to re-retrieve it
  await expect(outsideNodeClient.query(versionHash, 'select * from streamer()')).resolves.toEqual(
    expect.objectContaining({
      outputs: [{ record: 0 }, { record: 1 }, { record: 2 }],
    }),
  );

  // @ts-expect-error
  const db = nodeOutsideCluster.datastoreCore.datastoreRegistry.diskStore.datastoresDb;
  let dbxPath: string;
  {
    const record = db.versions.getByHash(versionHash);
    expect(record.expiresTimestamp).toBeTruthy();
    dbxPath = record.dbxPath;
    db.versions.restore(versionHash, dbxPath, Date.now() - 1);
  }

  const kadDb = nodeOutsideCluster.kad.db;
  for (const record of kadDb.providers.all()) {
    kadDb.providers.updateExpiration(record.providerNodeId, record.key, Date.now() - 1);
  }
  nodeOutsideCluster.kad.providers.cleanup();

  await new Promise(setImmediate);

  expect(onExpire).toHaveBeenCalled();
  // need to wait for this callback to finish
  await onExpire.mock.results[0].value;
  {
    const record = db.versions.getByHash(versionHash);
    expect(record.dbxPath).toBeNull();
    expect(Fs.existsSync(dbxPath)).toBeFalsy();
  }

  // should be able to re-retrieve it
  await expect(outsideNodeClient.query(versionHash, 'select * from streamer()')).resolves.toEqual(
    expect.objectContaining({
      outputs: [{ record: 0 }, { record: 1 }, { record: 2 }],
    }),
  );
}, 5e3);

test('should republish datastores on expired from kad if not expired locally', async () => {
  await packager.dbx.upload(await nodeWithServices.host);
  const outsideNodeClient = new DatastoreApiClient(await nodeOutsideCluster.host);
  Helpers.onClose(() => outsideNodeClient.disconnect());
  const versionHash = packager.manifest.versionHash;
  await expect(outsideNodeClient.getMeta(versionHash)).resolves.toBeTruthy();
  const onExpire = jest.spyOn(
    nodeOutsideCluster.datastoreCore.datastoreRegistry.diskStore,
    'didExpireNetworkHosting',
  );
  onExpire.mockReset();
  const reprovide = jest.spyOn(nodeOutsideCluster.kad, 'provide');

  // @ts-expect-error
  const db = nodeOutsideCluster.datastoreCore.datastoreRegistry.diskStore.datastoresDb;
  const firstVersionPublish = db.versions.getByHash(versionHash).publishedToNetworkTimestamp;
  expect(db.versions.getByHash(versionHash).dbxPath).not.toBeNull();

  const kadDb = nodeOutsideCluster.kad.db;
  for (const record of kadDb.providers.all()) {
    await kadDb.providers.updateExpiration(record.providerNodeId, record.key, Date.now() - 1);
  }
  nodeOutsideCluster.kad.providers.cleanup();

  await new Promise(setImmediate);

  expect(onExpire).toHaveBeenCalled();
  // need to wait for this callback to finish
  await onExpire.mock.results[0].value;
  expect(reprovide).toHaveBeenCalled();
  // need to wait for this callback to finish
  await reprovide.mock.results[0].value;
  {
    const record = db.versions.getByHash(versionHash);
    expect(record.dbxPath).toBeTruthy();
    expect(record.publishedToNetworkTimestamp).toBeGreaterThan(firstVersionPublish);
  }
}, 5e3);
