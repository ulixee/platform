import { CloudNode } from '@ulixee/cloud';
import { Crawler } from '@ulixee/datastore';
import DatastorePackager from '@ulixee/datastore-packager';
import { Helpers } from '@ulixee/datastore-testing';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import * as Fs from 'fs';
import { nanoid } from 'nanoid';
import * as Path from 'path';
import DatastoreRegistry from '../lib/DatastoreRegistry';
import StatsTracker from '../lib/StatsTracker';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Crawler.test');

let cloudNode: CloudNode;
let client: DatastoreApiClient;
let registry: DatastoreRegistry;
let statsTracker: StatsTracker;
const findCachedSpy = jest.spyOn<any, any>(Crawler.prototype, 'findCached');

beforeAll(async () => {
  if (Fs.existsSync(`${__dirname}/datastores/crawl.dbx`)) {
    Fs.rmSync(`${__dirname}/datastores/crawl.dbx`, { recursive: true });
  }

  cloudNode = await Helpers.createLocalNode(
    {
      datastoreConfiguration: {
        datastoresDir: storageDir,
        datastoresTmpDir: Path.join(storageDir, 'tmp'),
      },
    },
    true,
  );
  registry = cloudNode.datastoreCore.datastoreRegistry;
  statsTracker = cloudNode.datastoreCore.statsTracker;
  client = new DatastoreApiClient(await cloudNode.address);
  Helpers.onClose(() => client.disconnect(), true);
});

beforeEach(() => {
  findCachedSpy.mockClear();
});

afterEach(Helpers.afterEach);
afterAll(Helpers.afterAll);

test('should be able to run a crawler', async () => {
  const crawler = new DatastorePackager(`${__dirname}/datastores/crawl.js`);
  await crawler.build();
  await client.upload(await crawler.dbx.tarGzip());
  const affiliateId = `aff${nanoid(10)}`;
  await expect(
    client.stream(
      crawler.manifest.id,
      crawler.manifest.version,
      'crawlCall',
      {},
      { affiliateId },
    ),
  ).resolves.toEqual([{ version: '1', crawler: 'none', runCrawlerTime: expect.any(Date) }]);
  const { queryLogDb, statsDb } = statsTracker.diskStore;
  expect(queryLogDb.logTable.all()).toHaveLength(1);
  expect(queryLogDb.logTable.all()[0].query).toBe(`stream(crawlCall)`);
  expect(queryLogDb.logTable.all()[0].affiliateId).toBe(affiliateId);
  const stats = statsDb.datastoreEntities.all();
  expect(stats).toHaveLength(2);
  expect(stats.some(x => x.name === 'crawlCall')).toBeTruthy();
  expect(stats.some(x => x.name === 'crawl')).toBeTruthy();
});

test('should be able to query a crawler', async () => {
  const crawler = new DatastorePackager(`${__dirname}/datastores/crawl.js`);
  await crawler.build();
  try {
    await client.upload(await crawler.dbx.tarGzip());
  } catch (error) {
    if (error.code !== 'ERR_DUPLICATE_VERSION') throw error;
  }
  const { queryLogDb, statsDb } = statsTracker.diskStore;
  queryLogDb.logTable.db.exec(`delete from ${queryLogDb.logTable.tableName}`);
  statsDb.datastoreEntities.db.exec(`delete from ${statsDb.datastoreEntities.tableName}`);
  const affiliateId = `aff${nanoid(10)}`;
  await expect(
    client.query(
      crawler.manifest.id,
      crawler.manifest.version,
      'select * from crawlCall()',
      { affiliateId },
    ),
  ).resolves.toEqual(
    expect.objectContaining({
      outputs: [
        { version: '1', crawler: 'none', sessionId: null, runCrawlerTime: expect.any(Date) },
      ],
    }),
  );

  expect(queryLogDb.logTable.all()).toHaveLength(1);
  expect(queryLogDb.logTable.all()[0].query).toBe(`select * from crawlCall()`);
  expect(queryLogDb.logTable.all()[0].affiliateId).toBe(affiliateId);
  const stats = statsDb.datastoreEntities.all();
  expect(stats).toHaveLength(2);
  expect(stats.some(x => x.name === 'crawlCall')).toBeTruthy();
  expect(stats.some(x => x.name === 'crawl')).toBeTruthy();
});

test('should be able to ask a crawler for a cached result', async () => {
  const crawler = new DatastorePackager(`${__dirname}/datastores/crawl.js`);
  await crawler.build();
  try {
    await client.upload(await crawler.dbx.tarGzip());
  } catch (error) {
    if (error.code !== 'ERR_DUPLICATE_VERSION') throw error;
  }

  const result1 = await client.stream(
    crawler.manifest.id,
    crawler.manifest.version,
    'crawlCall',
    {
      sessionId: '1',
    },
  );
  expect(result1).toEqual([
    { version: '1', crawler: 'none', sessionId: '1', runCrawlerTime: expect.any(Date) },
  ]);

  // crawl is setup to pass in the run time from the first result
  await expect(
    client.stream(crawler.manifest.id, crawler.manifest.version, 'crawlCall', {
      sessionId: '2',
      maxTimeInCache: Date.now() - result1[0].runCrawlerTime.getTime() / 1e3,
    }),
    // should use cached version
  ).resolves.toEqual([{ version: '1', crawler: 'none', sessionId: '1' }]);
});

test('should get cached result by serialized input if no schema', async () => {
  const crawler = new DatastorePackager(`${__dirname}/datastores/crawl.js`);
  await crawler.build();
  try {
    await client.upload(await crawler.dbx.tarGzip());
  } catch (error) {
    if (error.code !== 'ERR_DUPLICATE_VERSION') throw error;
  }

  const result1 = await client.stream(
    crawler.manifest.id,
    crawler.manifest.version,
    'crawlCall',
    {
      sessionId: '1',
      test1: true,
      test2: 'abc',
    },
  );
  expect(result1).toEqual([
    { version: '1', crawler: 'none', sessionId: '1', runCrawlerTime: expect.any(Date) },
  ]);

  expect(findCachedSpy).toHaveBeenCalledTimes(1);
  await expect(findCachedSpy.mock.results[0].value).resolves.toBeNull();

  // crawl is setup to pass in the run time from the first result
  findCachedSpy.mockClear();
  await expect(
    client.stream(crawler.manifest.id, crawler.manifest.version, 'crawlCall', {
      sessionId: '2', // should not call the crawler
      maxTimeInCache: Date.now() - result1[0].runCrawlerTime.getTime() / 1e3,
      // change field order to test
      test2: 'abc',
      test1: true,
    }),
    // no crawler run time
  ).resolves.toEqual([{ version: '1', crawler: 'none', sessionId: '1' }]);
  expect(findCachedSpy).toHaveBeenCalledTimes(1);
  await expect(findCachedSpy.mock.results[0].value).resolves.toEqual({
    version: '1',
    crawler: 'none',
    sessionId: '1',
  });

  findCachedSpy.mockClear();
  await expect(
    client.stream(crawler.manifest.id, crawler.manifest.version, 'crawlCall', {
      sessionId: '3',
      maxTimeInCache: Date.now() - result1[0].runCrawlerTime.getTime() / 1e3,
      test2: 'somethingElse',
      test1: false,
    }),
  ).resolves.toEqual([
    {
      version: '1',
      crawler: 'none',
      sessionId: '3',
      runCrawlerTime: expect.any(Date),
    },
  ]);
  expect(findCachedSpy).toHaveBeenCalledTimes(1);
  await expect(findCachedSpy.mock.results[0].value).resolves.toBeNull();
});

test('should get cached result individual input columns', async () => {
  const crawler = new DatastorePackager(`${__dirname}/datastores/crawl.js`);
  await crawler.build();
  try {
    await client.upload(await crawler.dbx.tarGzip());
  } catch (error) {
    if (error.code !== 'ERR_DUPLICATE_VERSION') throw error;
  }

  const result1 = await client.stream(
    crawler.manifest.id,
    crawler.manifest.version,
    'crawlWithSchemaCall',
    {
      sessionId: '1',
      colBool: true,
      colNum: 1,
    },
  );
  expect(result1).toEqual([{ sessionId: '1', runCrawlerTime: expect.any(Date) }]);

  expect(findCachedSpy).toHaveBeenCalledTimes(1);
  await expect(findCachedSpy.mock.results[0].value).resolves.toBeNull();

  // crawl is setup to pass in the run time from the first result
  findCachedSpy.mockClear();
  await expect(
    client.stream(crawler.manifest.id, crawler.manifest.version, 'crawlWithSchemaCall', {
      sessionId: '2', // should not call the crawler
      maxTimeInCache: Date.now() - result1[0].runCrawlerTime.getTime() / 1e3,
      colBool: true,
      colNum: 1,
    }),
    // no crawler run time
  ).resolves.toEqual([{ sessionId: '1' }]);
  expect(findCachedSpy).toHaveBeenCalledTimes(1);
  await expect(findCachedSpy.mock.results[0].value).resolves.toEqual({
    version: '1',
    crawler: 'none',
    sessionId: '1',
  });

  findCachedSpy.mockClear();
  await expect(
    client.stream(crawler.manifest.id, crawler.manifest.version, 'crawlWithSchemaCall', {
      sessionId: '3',
      maxTimeInCache: Date.now() - result1[0].runCrawlerTime.getTime() / 1e3,
      colBool: false,
      colNum: 1,
    }),
  ).resolves.toEqual([
    {
      sessionId: '3',
      runCrawlerTime: expect.any(Date),
    },
  ]);
  expect(findCachedSpy).toHaveBeenCalledTimes(1);
  await expect(findCachedSpy.mock.results[0].value).resolves.toBeNull();
});
