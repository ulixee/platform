import { mkdirSync, promises as Fs, rmSync } from 'fs';
import * as Path from 'path';
import Packager from '@ulixee/datastore-packager';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import DbxFile from '@ulixee/datastore-packager/lib/DbxFile';
import { IDatastoreApiTypes } from '@ulixee/specification/datastore';
import Identity from '@ulixee/crypto/lib/Identity';
import SidechainClient from '@ulixee/sidechain';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import * as Hostile from 'hostile';
import UlixeeMiner from '@ulixee/miner';
import * as Moment from 'moment';
import DatastoreRegistry from '../lib/DatastoreRegistry';
import DatastoreCore from '../index';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'DatastoreCore.test');
const tmpDir = `${storageDir}/tmp`;
let bootupPackager: Packager;
let bootupDbx: DbxFile;
let miner: UlixeeMiner;
let client: DatastoreApiClient;

beforeAll(async () => {
  mkdirSync(storageDir, { recursive: true });
  DatastoreCore.options.datastoresTmpDir = tmpDir;
  DatastoreCore.options.datastoresDir = storageDir;
  DatastoreCore.options.identityWithSidechain = Identity.createSync();
  miner = new UlixeeMiner();
  miner.router.datastoreConfiguration = { datastoresDir: storageDir };
  await miner.listen();
  client = new DatastoreApiClient(await miner.address);
  bootupPackager = new Packager(require.resolve('./datastores/bootup.ts'));
  bootupDbx = await bootupPackager.build();
  if (process.env.CI !== 'true') Hostile.set('127.0.0.1', 'bootup-datastore.com');
}, 30e3);

afterAll(async () => {
  await miner.close();
  await client.disconnect();
  if (process.env.CI !== 'true') Hostile.remove('127.0.0.1', 'bootup-datastore.com');
  try {
    rmSync(storageDir, { recursive: true });
  } catch (err) {}
});

test('should install new datastores on startup', async () => {
  await Fs.copyFile(bootupDbx.dbxPath, `${storageDir}/bootup.dbx`);
  await DatastoreCore.installManuallyUploadedDbxFiles();
  const registry = new DatastoreRegistry(storageDir, tmpDir);
  expect(registry.hasVersionHash(bootupPackager.manifest.versionHash)).toBe(true);
  // @ts-expect-error
  const dbxPath = registry.getDbxPath(
    bootupPackager.manifest.scriptEntrypoint,
    bootupPackager.manifest.versionHash,
  );
  await expect(existsAsync(dbxPath)).resolves.toBeTruthy();
}, 45e3);

test('should be able to lookup a datastore domain', async () => {
  await expect(
    runApi('Datastore.upload', {
      compressedDatastore: await Fs.readFile(bootupDbx.dbxPath),
      allowNewLinkedVersionHistory: false,
    }),
  ).resolves.toEqual({ success: true });

  await expect(
    DatastoreApiClient.resolveDatastoreDomain(`bootup-datastore.com:${await miner.port}`),
  ).resolves.toEqual({
    host: await miner.address,
    datastoreVersionHash: bootupPackager.manifest.versionHash,
  });
}, 45e3);

test('can load a version from disk if not already open', async () => {
  await expect(
    runApi('Datastore.upload', {
      compressedDatastore: await Fs.readFile(bootupDbx.dbxPath),
      allowNewLinkedVersionHistory: false,
    }),
  ).resolves.toEqual({ success: true });

  const registry = new DatastoreRegistry(storageDir, tmpDir);
  // @ts-ignore
  await Fs.rm(registry.getDatastoreWorkingDirectory(bootupPackager.manifest.versionHash), {
    recursive: true,
  });

  await runApi('Datastore.query', {
    sql: 'SELECT * FROM bootup()',
    versionHash: bootupPackager.manifest.versionHash,
  });

  await expect(
    runApi('Datastore.query', {
      sql: 'SELECT * FROM bootup()',
      versionHash: bootupPackager.manifest.versionHash,
    }),
  ).resolves.toMatchObject({
    outputs: [{ success: true }],
    latestVersionHash: bootupPackager.manifest.versionHash,
  });
});

test('can get metadata about an uploaded datastore', async () => {
  jest.spyOn(SidechainClient.prototype, 'getSettings').mockImplementationOnce(() => {
    return Promise.resolve({
      settlementFeeMicrogons: 10,
    } as any);
  });
  await expect(
    runApi('Datastore.upload', {
      compressedDatastore: await Fs.readFile(bootupDbx.dbxPath),
      allowNewLinkedVersionHistory: false,
    }),
  ).resolves.toEqual({ success: true });
  await expect(
    runApi('Datastore.meta', { versionHash: bootupPackager.manifest.versionHash }),
  ).resolves.toEqual(<IDatastoreApiTypes['Datastore.meta']['result']>{
    latestVersionHash: bootupPackager.manifest.versionHash,
    computePricePerQuery: 0,
    runnersByName: {
      bootup: {
        stats: {
          averageBytesPerQuery: expect.any(Number),
          averageMilliseconds: expect.any(Number),
          averageTotalPricePerQuery: 0,
          maxBytesPerQuery: expect.any(Number),
          maxPricePerQuery: 0,
          maxMilliseconds: expect.any(Number),
        },
        pricePerQuery: 0,
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
    schemaInterface: `{
  tables: {};
  runners: {
    bootup: {
      output: {
        "is-valid"?: boolean;
        success: boolean;
      };
    };
  };
}`,
  });
});

test('can run a Datastore with momentjs', async () => {
  const packager = new Packager(require.resolve('./datastores/moment.ts'));
  const dbx = await packager.build();
  await dbx.upload(await miner.address);
  await expect(
    client.stream(packager.manifest.versionHash, 'moment', { date: '2021/02/01' }),
  ).rejects.toThrow('input did not match its Schema');

  await expect(
    client.stream(packager.manifest.versionHash, 'moment', { date: '2021-02-01' }),
  ).resolves.toEqual([{ date: Moment('2021-02-01').toDate() }]);
}, 45e3);

test('can get the stack trace of a compiled datastore', async () => {
  const packager = new Packager(require.resolve('./datastores/errorStackDatastore.ts'));
  const dbx = await packager.build();
  await dbx.upload(await miner.address);
  try {
    await client.stream(packager.manifest.versionHash, 'errorStack', {});
  } catch (error) {
    expect(error.stack).toContain(
      `at multiply (${packager.manifest.versionHash}/datastore/core/test/datastores/errorStack.ts:15:25)`,
    );
  }
}, 45e3);

function runApi<API extends keyof IDatastoreApiTypes & string>(
  Api: API,
  args: IDatastoreApiTypes[API]['args'],
): Promise<IDatastoreApiTypes[API]['result']> {
  // @ts-expect-error
  const context = DatastoreCore.getApiContext();
  // @ts-expect-error
  return DatastoreCore.apiRegistry.handlersByCommand[Api](args, context);
}
