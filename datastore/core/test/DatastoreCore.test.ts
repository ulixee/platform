import { mkdirSync, rmSync } from 'fs';
import * as Path from 'path';
import Packager from '@ulixee/datastore-packager';
import { copyDir, existsAsync } from '@ulixee/commons/lib/fileUtils';
import Dbx from '@ulixee/datastore-packager/lib/Dbx';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import SidechainClient from '@ulixee/sidechain';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import * as Hostile from 'hostile';
import { CloudNode } from '@ulixee/cloud';
import DatastoreRegistry from '../lib/DatastoreRegistry';
import DatastoreCore from '../index';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'DatastoreCore.test');
const tmpDir = `${storageDir}/tmp`;
let bootupPackager: Packager;
let bootupDbx: Dbx;
let cloudNode: CloudNode;
let client: DatastoreApiClient;

beforeAll(async () => {
  mkdirSync(storageDir, { recursive: true });
  DatastoreCore.options.datastoresTmpDir = tmpDir;
  DatastoreCore.options.datastoresDir = storageDir;
  cloudNode = new CloudNode();
  cloudNode.router.datastoreConfiguration = {
    datastoresDir: storageDir,
    datastoresTmpDir: Path.join(storageDir, 'tmp'),
  };
  await cloudNode.listen();
  client = new DatastoreApiClient(await cloudNode.address);
  bootupPackager = new Packager(require.resolve('./datastores/bootup.ts'));
  bootupDbx = await bootupPackager.build();
  if (process.env.CI !== 'true') Hostile.set('127.0.0.1', 'bootup-datastore.com');
}, 60e3);

afterAll(async () => {
  await cloudNode.close();
  await client.disconnect();
  if (process.env.CI !== 'true') Hostile.remove('127.0.0.1', 'bootup-datastore.com');
  try {
    rmSync(storageDir, { recursive: true });
  } catch (err) {}
});

test('should install new datastores on startup', async () => {
  await copyDir(bootupDbx.path, `${storageDir}/bootup.dbx`);
  const registry = new DatastoreRegistry(storageDir);
  await registry.installManuallyUploadedDbxFiles();
  expect(registry.hasVersionHash(bootupPackager.manifest.versionHash)).toBe(true);
  // @ts-expect-error
  const dbxPath = registry.createDbxPath(bootupPackager.manifest);
  await expect(existsAsync(dbxPath)).resolves.toBeTruthy();
}, 45e3);

test('should be able to lookup a datastore domain', async () => {
  await expect(
    runApi('Datastore.upload', {
      compressedDatastore: await bootupDbx.tarGzip(),
      allowNewLinkedVersionHistory: false,
    }),
  ).resolves.toEqual({ success: true });

  await expect(
    DatastoreApiClient.resolveDatastoreDomain(`bootup-datastore.com:${await cloudNode.port}`),
  ).resolves.toEqual({
    host: await cloudNode.address,
    datastoreVersionHash: bootupPackager.manifest.versionHash,
  });
}, 45e3);

test('can get metadata about an uploaded datastore', async () => {
  jest.spyOn(SidechainClient.prototype, 'getSettings').mockImplementationOnce(() => {
    return Promise.resolve({
      settlementFeeMicrogons: 10,
    } as any);
  });
  await expect(
    runApi('Datastore.upload', {
      compressedDatastore: await bootupDbx.tarGzip(),
      allowNewLinkedVersionHistory: false,
    }),
  ).resolves.toEqual({ success: true });
  await expect(
    runApi('Datastore.meta', { versionHash: bootupPackager.manifest.versionHash }),
  ).resolves.toEqual(<IDatastoreApiTypes['Datastore.meta']['result']>{
    versionHash: bootupPackager.manifest.versionHash,
    versionTimestamp: new Date(),
    description: undefined,
    isStarted: true,
    scriptEntrypoint: bootupPackager.manifest.scriptEntrypoint,
    name: undefined,
    latestVersionHash: bootupPackager.manifest.versionHash,
    computePricePerQuery: 0,
    stats: {
      queries: 0,
      errors: 0,
      totalSpend: 0,
      totalCreditSpend: 0,
      averageBytesPerQuery: expect.any(Number),
      averageMilliseconds: expect.any(Number),
      averageTotalPricePerQuery: 0,
      maxBytesPerQuery: expect.any(Number),
      maxPricePerQuery: 0,
      maxMilliseconds: expect.any(Number),
    },
    extractorsByName: {
      bootup: {
        description: undefined,
        stats: {
          queries: 0,
          errors: 0,
          totalSpend: 0,
          totalCreditSpend: 0,
          averageBytesPerQuery: expect.any(Number),
          averageMilliseconds: expect.any(Number),
          averageTotalPricePerQuery: 0,
          maxBytesPerQuery: expect.any(Number),
          maxPricePerQuery: 0,
          maxMilliseconds: expect.any(Number),
        },
        pricePerQuery: 0,
        schemaJson: undefined,
        minimumPrice: 0,
        priceBreakdown: [
          {
            perQuery: 0,
            minimum: 0,
          },
        ],
      },
    },
    tablesByName: {},
    crawlersByName: {},
    schemaInterface: `{
  tables: {};
  extractors: {
    bootup: {
      output: {
        "is-valid"?: boolean;
        success: boolean;
      };
    };
  };
  crawlers: {};
}`,
  });
});

function runApi<API extends keyof IDatastoreApiTypes & string>(
  Api: API,
  args: IDatastoreApiTypes[API]['args'],
): Promise<IDatastoreApiTypes[API]['result']> {
  // @ts-expect-error
  const context = DatastoreCore.getApiContext();
  // @ts-expect-error
  return DatastoreCore.apiRegistry.handlersByCommand[Api](args, context);
}
