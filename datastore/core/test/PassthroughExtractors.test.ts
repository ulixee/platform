import { Chain, ChainIdentity } from '@argonprotocol/localchain';
import { Keyring } from '@argonprotocol/mainchain';
import { CloudNode } from '@ulixee/cloud';
import DatastorePackager from '@ulixee/datastore-packager';
import { Helpers } from '@ulixee/datastore-testing';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import ArgonReserver from '@ulixee/datastore/payments/ArgonReserver';
import CreditReserver from '@ulixee/datastore/payments/CreditReserver';
import * as Fs from 'fs';
import * as Path from 'path';
import MockArgonPaymentProcessor from './_MockArgonPaymentProcessor';
import MockPaymentService from './_MockPaymentService';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'PassthroughExtractors.test');

let cloudNode: CloudNode;
let client: DatastoreApiClient;

const keyring = new Keyring({ ss58Format: 18 });

Helpers.blockGlobalConfigWrites();
const argonPaymentProcessorMock = new MockArgonPaymentProcessor();

const mainchainIdentity = {
  chain: Chain.Devnet,
  genesisHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
} as ChainIdentity;

let remoteVersion: string;
let remoteDatastoreId: string;
beforeAll(async () => {
  for (const file of [
    'passthroughExtractor',
    'passthroughExtractorUpcharge',
    'passthroughExtractorNoOnresponse',
    'hop2',
  ]) {
    if (Fs.existsSync(`${__dirname}/datastores/${file}.js`)) {
      Fs.unlinkSync(`${__dirname}/datastores/${file}.js`);
    }
    if (Fs.existsSync(`${__dirname}/datastores/${file}.dbx`)) {
      await Fs.promises.rm(`${__dirname}/datastores/${file}.dbx`, { recursive: true });
    }
  }

  if (Fs.existsSync(`${__dirname}/datastores/remoteExtractor.dbx`)) {
    await Fs.promises.rm(`${__dirname}/datastores/remoteExtractor.dbx`, { recursive: true });
  }

  cloudNode = await Helpers.createLocalNode(
    {
      datastoreConfiguration: {
        datastoresDir: storageDir,
      },
    },
    true,
    {
      address: keyring.createFromUri('upstream').address,
      notaryId: 1,
      ...mainchainIdentity,
    },
  );
  client = new DatastoreApiClient(await cloudNode.address);
  Helpers.onClose(() => client.disconnect(), true);

  const packager = new DatastorePackager(`${__dirname}/datastores/remoteExtractor.js`);
  await packager.build();
  await client.upload(await packager.dbx.tarGzip());
  remoteVersion = packager.manifest.version;
  remoteDatastoreId = packager.manifest.id;
});

let storageCounter = 0;

beforeEach(() => {
  storageCounter += 1;
  ArgonReserver.baseStorePath = Path.join(storageDir, `payments-${storageCounter}`);
  CreditReserver.defaultBasePath = Path.join(storageDir, `credits-${storageCounter}`);
});

afterEach(Helpers.afterEach);

afterAll(async () => {
  await Helpers.afterAll();
});

test('should be able to have a passthrough extractor', async () => {
  await expect(
    client.stream(remoteDatastoreId, remoteVersion, 'remote', { test: '123d' }),
  ).resolves.toEqual([{ iAmRemote: true, echo: '123d' }]);

  Fs.writeFileSync(
    `${__dirname}/datastores/passthroughExtractor.js`,
    `const Datastore = require('@ulixee/datastore');
const { boolean, string } = require('@ulixee/schema');

export default new Datastore({
  remoteDatastores: {
    source: 'ulx://${await cloudNode.address}/${remoteDatastoreId}@v${remoteVersion}',
  },
  extractors: {
    pass: new Datastore.PassthroughExtractor({
      remoteExtractor: 'source.remote',
      schema: {
        input: {
          test: string(),
        },
        output: {
          iAmRemote: boolean(),
          echo: string(),
          addOn: string(),
        },
      },
      async onResponse({ stream, Output }) {
        for await (const output of stream) {
          Output.emit({ ...output, addOn: 'phew' })
        }
      },
    }),
  },
});`,
  );

  const passthrough = new DatastorePackager(`${__dirname}/datastores/passthroughExtractor.js`);
  await passthrough.build({ createTemporaryVersion: true });
  await client.upload(await passthrough.dbx.tarGzip());

  await expect(
    client.stream(passthrough.manifest.id, passthrough.manifest.version, 'pass', {
      test: '123d',
    }),
  ).resolves.toEqual([{ iAmRemote: true, echo: '123d', addOn: 'phew' }]);
});

test('should re-emit output automatically if no onResponse is provided', async () => {
  await expect(
    client.stream(remoteDatastoreId, remoteVersion, 'remote', { test: '123d' }),
  ).resolves.toEqual([{ iAmRemote: true, echo: '123d' }]);

  Fs.writeFileSync(
    `${__dirname}/datastores/passthroughExtractorNoOnresponse.js`,
    `const Datastore = require('@ulixee/datastore');
const { boolean, string } = require('@ulixee/schema');

export default new Datastore({
  remoteDatastores: {
    source: 'ulx://${await cloudNode.address}/${remoteDatastoreId}@v${remoteVersion}',
  },
  extractors: {
    pass: new Datastore.PassthroughExtractor({
      remoteExtractor: 'source.remote',
      schema: {
        input: {
          test: string(),
        },
        output: {
          iAmRemote: boolean(),
          echo: string(),
        },
      }
    }),
  },
});`,
  );

  const passthrough = new DatastorePackager(
    `${__dirname}/datastores/passthroughExtractorNoOnresponse.js`,
  );
  await passthrough.build({ createTemporaryVersion: true });
  await client.upload(await passthrough.dbx.tarGzip());

  await expect(
    client.stream(passthrough.manifest.id, passthrough.manifest.version, 'pass', {
      test: '123d',
    }),
  ).resolves.toEqual([{ iAmRemote: true, echo: '123d' }]);
});

test('should be able to add upcharge to a extractor', async () => {
  Fs.writeFileSync(
    `${__dirname}/datastores/passthroughExtractorUpcharge.js`,
    `
const Datastore = require('@ulixee/datastore');
const { boolean, string } = require('@ulixee/schema');

export default new Datastore({
  remoteDatastores: {
    source: 'ulx://${await cloudNode.address}/${remoteDatastoreId}@v${remoteVersion}',
  },
  extractors: {
    pass: new Datastore.PassthroughExtractor({
      upcharge: 400,
      remoteExtractor: 'source.remote',
      async onResponse({ stream, Output }) {
        for await (const output of stream) {
           Output.emit({ ...output, addOn: 'phew '})
        }
      },
    }),
  },
});`,
  );

  const passthrough = new DatastorePackager(
    `${__dirname}/datastores/passthroughExtractorUpcharge.js`,
  );
  await passthrough.build({ createTemporaryVersion: true });
  await client.upload(await passthrough.dbx.tarGzip());

  const meta = await client.getMeta(passthrough.manifest.id, passthrough.manifest.version);
  expect(meta.extractorsByName.pass.netBasePrice).toBe(400);
  expect(meta.extractorsByName.pass.priceBreakdown).toEqual([
    { basePrice: 400 },
    { basePrice: 0, remoteMeta: expect.any(Object) },
  ]);
});

test('should be able to add charges from multiple extractors', async () => {
  const address1 = keyring.createFromUri('extractor1');
  let sourceCloudAddress: string;
  let hop1CloudAddress: string;
  const sourceDatastoreId = 'source-store';
  const hop1DatastoreId = 'hop1-store';

  const channelHolds: { datastoreId: string; holdAmount: bigint; channelHoldId: string }[] = [];
  const clientAddress = keyring.createFromUri('client');
  const paymentService = new MockPaymentService(clientAddress, client, null, 'client');
  const paymentServices: MockPaymentService[] = [paymentService];
  let hop1Cloud: CloudNode;
  let sourceCloudNode: CloudNode;

  argonPaymentProcessorMock.mock((id, balanceChange) => {
    const channelHoldId = paymentServices
      .map(x => x.paymentsByDatastoreId[id])
      .find(Boolean).channelHoldId;
    const channelHold = paymentServices.map(x => x.channelHoldsById[channelHoldId]).find(Boolean);
    channelHolds.push({
      datastoreId: id,
      channelHoldId,
      holdAmount: channelHold.channelHoldAmount,
    });
    return {
      id: channelHoldId,
      expirationTick: channelHold.tick + 100,
      holdAmount: channelHold.channelHoldAmount,
    };
  });

  {
    const sourceCloudDir = Path.join(storageDir, 'sourceCloud');
    Fs.mkdirSync(sourceCloudDir, { recursive: true });
    sourceCloudNode = await Helpers.createLocalNode(
      {
        datastoreConfiguration: {
          datastoresDir: sourceCloudDir,
        },
      },
      false,
      {
        address: address1.address,
        notaryId: 1,
        ...mainchainIdentity,
      },
    );
    sourceCloudAddress = await sourceCloudNode.address;

    Fs.writeFileSync(
      `${__dirname}/datastores/source.js`,
      `
const Datastore = require('@ulixee/datastore');
const { boolean, string } = require('@ulixee/schema');

export default new Datastore({
  id: '${sourceDatastoreId}',
  version: '0.0.1', 
  extractors: {
    source: new Datastore.Extractor({
      basePrice: 6,
      run({ input, Output }) {
        const output = new Output();
        output.calls = 1;
        output.lastRun = 'source';
      }
    }),
  },
});`,
    );
    const dbx = new DatastorePackager(`${__dirname}/datastores/source.js`);
    try {
      await dbx.build();
    } catch (err) {
      console.log('ERROR Uploading Manifest', err);
      throw err;
    }
    Helpers.onClose(() => Fs.promises.unlink(`${__dirname}/datastores/source.js`));
    Helpers.onClose(() =>
      Fs.promises.rm(`${__dirname}/datastores/source.dbx`, { recursive: true }),
    );
    const client1 = new DatastoreApiClient(await sourceCloudNode.address);
    Helpers.onClose(() => client1.disconnect());
    await client1.upload(await dbx.dbx.tarGzip());
    const price = await client1.pricing.getEntityPrice(sourceDatastoreId, '0.0.1', 'source');
    expect(price).toBe(6);
  }
  const address2 = keyring.createFromUri('extractor2');

  {
    const cloud2StorageDir = Path.join(storageDir, 'hop1Cloud');
    Fs.mkdirSync(cloud2StorageDir, { recursive: true });
    hop1Cloud = await Helpers.createLocalNode(
      {
        datastoreConfiguration: {
          datastoresDir: cloud2StorageDir,
        },
      },
      true,
      {
        address: keyring.createFromUri('extractor2').address,
        notaryId: 1,
        ...mainchainIdentity,
      },
    );
    hop1CloudAddress = await hop1Cloud.address;
    const corePaymentService = new MockPaymentService(
      address2,
      new DatastoreApiClient(sourceCloudAddress),
      null,
      'hop1cloud',
    );
    paymentServices.push(corePaymentService);
    mockUpstreamPayments(corePaymentService, hop1Cloud);

    Fs.writeFileSync(
      `${__dirname}/datastores/hop1.js`,
      `
const Datastore = require('@ulixee/datastore');
const { boolean, string } = require('@ulixee/schema');

export default new Datastore({
  id: '${hop1DatastoreId}',
  version: '0.0.1',
  remoteDatastores: {
    hop0: 'ulx://${sourceCloudAddress}/${sourceDatastoreId}@v0.0.1',
  },
  extractors: {
    source2: new Datastore.PassthroughExtractor({
      upcharge: 11,
      remoteExtractor: 'hop0.source',
      async onResponse({ stream, Output }) {
        for await (const output of stream) {
           Output.emit({ ...output, lastRun:'hop1', calls: output.calls +1 })
        }
      },
    }),
  },
});`,
    );

    const dbx = new DatastorePackager(`${__dirname}/datastores/hop1.js`);
    Helpers.onClose(() => Fs.promises.unlink(`${__dirname}/datastores/hop1.js`));
    Helpers.onClose(() => Fs.promises.rm(`${__dirname}/datastores/hop1.dbx`, { recursive: true }));
    await dbx.build();
    const client2 = new DatastoreApiClient(await hop1Cloud.address);
    Helpers.onClose(() => client2.disconnect());
    await client2.upload(await dbx.dbx.tarGzip());
    const price = await client2.pricing.getEntityPrice(hop1DatastoreId, '0.0.1', 'source2');
    expect(price).toBe(6 + 11);
  }
  Fs.writeFileSync(
    `${__dirname}/datastores/hop2.js`,
    `
const Datastore = require('@ulixee/datastore');
const { boolean, string } = require('@ulixee/schema');

export default new Datastore({
  remoteDatastores: {
    hop1: 'ulx://${hop1CloudAddress}/${hop1DatastoreId}@v0.0.1',
  },
  extractors: {
    last: new Datastore.PassthroughExtractor({
      upcharge: 3,
      remoteExtractor: 'hop1.source2',
      async onResponse({ stream, Output }) {
        for await (const output of stream) {
           Output.emit({ ...output, lastRun:'hop2', calls: output.calls +1 })
        }
      },
    }),
  },
});`,
  );

  const lastHop = new DatastorePackager(`${__dirname}/datastores/hop2.js`);
  await lastHop.build({ createTemporaryVersion: true });
  await client.upload(await lastHop.dbx.tarGzip());
  const hop2DatastoreId = lastHop.manifest.id;

  const price = await client.pricing.getEntityPrice(
    lastHop.manifest.id,
    lastHop.manifest.version,
    'last',
  );
  expect(price).toBe(3 + 6 + 11);

  await expect(
    client.pricing.getQueryPrice(
      lastHop.manifest.id,
      lastHop.manifest.version,
      'select * from last()',
    ),
  ).resolves.toBe(price);

  const corePaymentService = new MockPaymentService(
    keyring.createFromUri('upstream'),
    new DatastoreApiClient(hop1CloudAddress),
    null,
    'hop2cloud',
  );
  paymentServices.push(corePaymentService);
  mockUpstreamPayments(corePaymentService, cloudNode);
  const result = await client.query(
    lastHop.manifest.id,
    lastHop.manifest.version,
    'select * from last()',
    {
      paymentService,
    },
  );
  expect(result.outputs[0].calls).toBe(3);
  expect(result.outputs[0].lastRun).toBe('hop2');
  expect(result.metadata.microgons).toBe(price);

  expect(channelHolds).toHaveLength(3);
  // @ts-expect-error
  let dbs = sourceCloudNode.datastoreCore.argonPaymentProcessor.channelHoldDbsByDatastore;
  expect(dbs.size).toBe(1);

  const paymentsByDatastoreId = {};
  for (const service of paymentServices) {
    Object.assign(paymentsByDatastoreId, service.paymentsByDatastoreId);
  }
  expect(dbs.get(sourceDatastoreId).paymentIdByChannelHoldId.size).toBe(1);
  expect(dbs.get(sourceDatastoreId).list()).toEqual([
    expect.objectContaining({
      id: paymentsByDatastoreId[sourceDatastoreId].channelHoldId,
      allocated: 1000,
      remaining: 1000 - 6,
    }),
  ]);
  // @ts-expect-error
  dbs = hop1Cloud.datastoreCore.argonPaymentProcessor.channelHoldDbsByDatastore;
  expect(dbs.size).toBe(1);

  expect(dbs.get(hop1DatastoreId).paymentIdByChannelHoldId.size).toBe(1);
  expect(dbs.get(hop1DatastoreId).list()).toEqual([
    expect.objectContaining({
      id: paymentsByDatastoreId[hop1DatastoreId].channelHoldId,
      allocated: 2000,
      remaining: 2000 - 6 - 11,
    }),
  ]);

  // @ts-expect-error
  dbs = argonPaymentProcessor.channelHoldDbsByDatastore;
  expect(dbs.size).toBe(1);

  expect(dbs.get(hop2DatastoreId).paymentIdByChannelHoldId.size).toBe(1);
  expect(dbs.get(hop2DatastoreId).list()).toEqual([
    expect.objectContaining({
      id: paymentsByDatastoreId[hop2DatastoreId].channelHoldId,
      allocated: 2000,
      remaining: 2000 - 6 - 11 - 3,
    }),
  ]);

  let queryLog = sourceCloudNode.datastoreCore.statsTracker.diskStore.queryLogDb.logTable
    .all()
    .filter(x => [sourceDatastoreId, hop1DatastoreId, hop2DatastoreId].includes(x.datastoreId));
  expect(queryLog).toHaveLength(1);
  const queryId = result.queryId;
  expect(queryLog[0].queryId).toBe(`${queryId}.1.1`);
  expect(queryLog[0].datastoreId).toBe(sourceDatastoreId);

  queryLog = hop1Cloud.datastoreCore.statsTracker.diskStore.queryLogDb.logTable
    .all()
    .filter(x => [sourceDatastoreId, hop1DatastoreId, hop2DatastoreId].includes(x.datastoreId));
  expect(queryLog).toHaveLength(1);
  expect(queryLog[0].queryId).toBe(`${queryId}.1`);

  queryLog = cloudNode.datastoreCore.statsTracker.diskStore.queryLogDb.logTable
    .all()
    .filter(x => [sourceDatastoreId, hop1DatastoreId, hop2DatastoreId].includes(x.datastoreId));
  expect(queryLog[0].queryId).toBe(queryId);
});

function mockUpstreamPayments(
  corePaymentService: MockPaymentService,
  registerOnCloudNode: CloudNode,
) {
  registerOnCloudNode.datastoreCore.upstreamDatastorePaymentService = corePaymentService;
  // @ts-expect-error
  registerOnCloudNode.datastoreCore.vm.remotePaymentService = corePaymentService;
}
