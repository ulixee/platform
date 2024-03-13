import { Keyring } from '@polkadot/keyring';
import { CloudNode } from '@ulixee/cloud';
import DatastorePackager from '@ulixee/datastore-packager';
import { Helpers } from '@ulixee/datastore-testing';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import LocalchainPaymentService from '@ulixee/datastore/payments/LocalchainPaymentService';
import * as Fs from 'fs';
import * as Path from 'path';
import EscrowSpendTracker from '../lib/EscrowSpendTracker';
import MockEscrowSpendTracker from './_MockEscrowSpendTracker';
import MockPaymentService from './_MockPaymentService';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'PassthroughExtractors.test');

let cloudNode: CloudNode;
let client: DatastoreApiClient;

const keyring = new Keyring({ ss58Format: 18 });

Helpers.blockGlobalConfigWrites();
const escrowSpendTrackerMock = new MockEscrowSpendTracker();
const escrowSpendTracker = new EscrowSpendTracker(storageDir, null);

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
  );
  cloudNode.datastoreCore.escrowSpendTracker = escrowSpendTracker;
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
  LocalchainPaymentService.storePath = Path.join(storageDir, `payments-${storageCounter}.json`);
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
  payment: {
    notaryId: 1,
    address: "${new Keyring().createFromUri('upstream').address}",
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
  let version: string;
  let sourceDatastoreId: string;
  let hop1DatastoreId: string;
  {
    Fs.writeFileSync(
      `${__dirname}/datastores/source.js`,
      `
const Datastore = require('@ulixee/datastore');
const { boolean, string } = require('@ulixee/schema');

export default new Datastore({
  payment: {
    address: '${address1.address}',
    notaryId: 1,
  },
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
      await dbx.build({ createTemporaryVersion: true });
    } catch (err) {
      console.log('ERROR Uploading Manifest', err);
      throw err;
    }
    Helpers.onClose(() => Fs.promises.unlink(`${__dirname}/datastores/source.js`));
    Helpers.onClose(() =>
      Fs.promises.rm(`${__dirname}/datastores/source.dbx`, { recursive: true }),
    );
    await new DatastoreApiClient(await cloudNode.address).upload(await dbx.dbx.tarGzip());
    version = dbx.manifest.version;
    sourceDatastoreId = dbx.manifest.id;
    expect(dbx.manifest.payment).toBeTruthy();
    const price = await client.pricing.getEntityPrice(sourceDatastoreId, version, 'source');
    expect(price).toBe(6);
  }
  const address2 = keyring.createFromUri('extractor2');
  {
    Fs.writeFileSync(
      `${__dirname}/datastores/hop1.js`,
      `
const Datastore = require('@ulixee/datastore');
const { boolean, string } = require('@ulixee/schema');

export default new Datastore({
  payment: {
    address:'${address2.address}',
    notaryId: 1,
  },
  remoteDatastores: {
    hop0: 'ulx://${await cloudNode.address}/${sourceDatastoreId}@v${version}',
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
    await dbx.build({ createTemporaryVersion: true });
    await new DatastoreApiClient(await cloudNode.address).upload(await dbx.dbx.tarGzip());
    version = dbx.manifest.version;
    hop1DatastoreId = dbx.manifest.id;
    const price = await client.pricing.getEntityPrice(hop1DatastoreId, version, 'source2');
    expect(price).toBe(6 + 11);
  }
  const address3 = keyring.createFromUri('extractor3');
  Fs.writeFileSync(
    `${__dirname}/datastores/hop2.js`,
    `
const Datastore = require('@ulixee/datastore');
const { boolean, string } = require('@ulixee/schema');

export default new Datastore({
  payment: {
    address:'${address3.address}',
    notaryId: 1,
  },
  remoteDatastores: {
    hop1: 'ulx://${await cloudNode.address}/${hop1DatastoreId}@v${version}',
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

  const clientAddress = keyring.createFromUri('client');
  const paymentService = new MockPaymentService(clientAddress, client);
  const client2 = keyring.createFromUri('upstream');
  const corePaymentService = new MockPaymentService(
    client2,
    cloudNode.datastoreCore.datastoreApiClients.get(await cloudNode.address),
  );
  const escrows: { datastoreId: string; holdAmount: bigint; escrowId: string }[] = [];
  escrowSpendTrackerMock.mock((id, balanceChange) => {
    const escrowId = (
      paymentService.paymentsByDatastoreId[id] ?? corePaymentService.paymentsByDatastoreId[id]
    ).escrowId;
    const escrow = paymentService.escrowsById[escrowId] ?? corePaymentService.escrowsById[escrowId];
    escrows.push({ datastoreId: id, escrowId, holdAmount: escrow.escrowHoldAmount });
    return {
      id: escrowId,
      expirationTick: escrow.tick + 100,
      holdAmount: escrow.escrowHoldAmount,
    };
  });

  cloudNode.datastoreCore.remoteDatastorePaymentService = corePaymentService;
  // @ts-expect-error
  cloudNode.datastoreCore.vm.remotePaymentService =
    cloudNode.datastoreCore.remoteDatastorePaymentService;
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

  expect(escrows).toHaveLength(3);
  // @ts-expect-error
  const dbs = escrowSpendTracker.escrowDbsByDatastore;
  expect(dbs.size).toBe(3);
  // @ts-expect-error
  expect(dbs.get(sourceDatastoreId).paymentIdByEscrowId.size).toBe(1);
  expect(dbs.get(sourceDatastoreId).list()).toEqual([
    expect.objectContaining({
      id: corePaymentService.paymentsByDatastoreId[sourceDatastoreId].escrowId,
      allocated: 1000,
      remaining: 1000 - 6,
    }),
  ]);
  // @ts-expect-error
  expect(dbs.get(hop1DatastoreId).paymentIdByEscrowId.size).toBe(1);
  expect(dbs.get(hop1DatastoreId).list()).toEqual([
    expect.objectContaining({
      id: corePaymentService.paymentsByDatastoreId[hop1DatastoreId].escrowId,
      allocated: 2000,
      remaining: 2000 - 6 - 11,
    }),
  ]);
  // @ts-expect-error
  expect(dbs.get(hop2DatastoreId).paymentIdByEscrowId.size).toBe(1);
  expect(dbs.get(hop2DatastoreId).list()).toEqual([
    expect.objectContaining({
      id: paymentService.paymentsByDatastoreId[hop2DatastoreId].escrowId,
      allocated: 2000,
      remaining: 2000 - 6 - 11 - 3,
    }),
  ]);

  const queryLog = cloudNode.datastoreCore.statsTracker.diskStore.queryLogDb.logTable
    .all()
    .filter(x => [sourceDatastoreId, hop1DatastoreId, hop2DatastoreId].includes(x.datastoreId));
  expect(queryLog).toHaveLength(3);
  const queryId = result.queryId;
  expect(queryLog[0].queryId).toBe(`${queryId}.1.1`);
  expect(queryLog[1].queryId).toBe(`${queryId}.1`);
  expect(queryLog[2].queryId).toBe(queryId);
  expect(queryLog.map(x => x.datastoreId)).toEqual([
    sourceDatastoreId,
    hop1DatastoreId,
    hop2DatastoreId,
  ]);
});
