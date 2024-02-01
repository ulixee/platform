import { CloudNode } from '@ulixee/cloud';
import DatastorePackager from '@ulixee/datastore-packager';
import { Helpers } from '@ulixee/datastore-testing';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import * as Fs from 'fs';
import * as Path from 'path';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'DatastoreRegistryService.test');

let plainNode: CloudNode;
let nodeWithServices: CloudNode;
let client: DatastoreApiClient;
let packager: DatastorePackager;

beforeAll(async () => {
  nodeWithServices = await Helpers.createLocalNode(
    {
      datastoreConfiguration: {
        datastoresDir: Path.join(storageDir, 'with-services'),
      },
      hostedServicesServerOptions: { port: 0 },
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

  client = new DatastoreApiClient(await plainNode.address);
  Fs.writeFileSync(
    `${__dirname}/datastores/datastoreRegistryService1-manifest.json`,
    JSON.stringify({ storageEngineHost: await nodeWithServices.host }),
  );
  await Fs.promises
    .rm(`${__dirname}/datastores/datastoreRegistryService1.dbx`, { recursive: true })
    .catch(() => null);
  packager = new DatastorePackager(`${__dirname}/datastores/datastoreRegistryService1.js`);
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
  await packager.dbx.upload(await nodeWithServices.host).catch(()=>null);
  const clusterNodeGet = jest.spyOn(nodeWithServices.datastoreCore.datastoreRegistry, 'get');
  const plainNodeCheckCluster = jest.spyOn(
    plainNode.datastoreCore.datastoreRegistry.clusterStore,
    'get',
  );
  const plainNodeDownloadFromCluster = jest.spyOn(
    plainNode.datastoreCore.datastoreRegistry.clusterStore,
    'downloadDbx',
  );
  await expect(
    client.getMeta(packager.manifest.id, packager.manifest.version),
  ).resolves.toBeTruthy();
  expect(clusterNodeGet).toHaveBeenCalled();
  expect(plainNodeCheckCluster).toHaveBeenCalledTimes(1);
  expect(plainNodeDownloadFromCluster).toHaveBeenCalledTimes(1);
});
