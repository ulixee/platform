import { CloudNode } from '@ulixee/cloud';
import { concatAsBuffer, encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import { sha256 } from '@ulixee/commons/lib/hashUtils';
import Address from '@ulixee/crypto/lib/Address';
import Identity from '@ulixee/crypto/lib/Identity';
import DatastorePackager from '@ulixee/datastore-packager';
import { Helpers } from '@ulixee/datastore-testing';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import ICoreRequestPayload from '@ulixee/net/interfaces/ICoreRequestPayload';
import SidechainClient from '@ulixee/sidechain';
import ArgonUtils from '@ulixee/sidechain/lib/ArgonUtils';
import MicronoteBatchFunding from '@ulixee/sidechain/lib/MicronoteBatchFunding';
import { IBlockSettings } from '@ulixee/specification';
import { ISidechainApis } from '@ulixee/specification/sidechain';
import IMicronoteApis from '@ulixee/specification/sidechain/MicronoteApis';
import ISidechainInfoApis from '@ulixee/specification/sidechain/SidechainInfoApis';
import * as Fs from 'fs';
import { customAlphabet } from 'nanoid';
import * as Path from 'path';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'PassthroughExtractors.test');

let cloudNode: CloudNode;
let client: DatastoreApiClient;
const sidechainIdentity = Identity.createSync();
const batchIdentity = Identity.createSync();
const batchSlug = customAlphabet('0123456789ABCDEF', 14)();

const apiCalls = jest.fn();

Helpers.blockGlobalConfigWrites();

const mock = {
  sidechainClient: {
    sendRequest: jest.spyOn<any, any>(SidechainClient.prototype, 'sendRequest'),
  },
  MicronoteBatchFunding: {
    verifyBatch: jest.spyOn<any, any>(MicronoteBatchFunding.prototype, 'verifyBatch'),
    fundBatch: jest.spyOn(MicronoteBatchFunding.prototype, 'fundBatch'),
  },
};

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

  mock.MicronoteBatchFunding.fundBatch.mockImplementation(async function (batch, centagons) {
    return this.recordBatchFund(
      '1'.padEnd(30, '0'),
      ArgonUtils.centagonsToMicrogons(centagons),
      batch,
    );
  });

  mock.sidechainClient.sendRequest.mockImplementation(mockSidechainServer);

  cloudNode = await Helpers.createLocalNode(
    {
      datastoreConfiguration: {
        datastoresDir: storageDir,
        identityWithSidechain: Identity.createSync(),
        defaultSidechainHost: 'http://localhost:1337',
        defaultSidechainRootIdentity: sidechainIdentity.bech32,
        approvedSidechains: [
          { rootIdentity: sidechainIdentity.bech32, url: 'http://localhost:1337' },
        ],
      },
    },
    true,
  );
  client = new DatastoreApiClient(await cloudNode.address);
  Helpers.onClose(() => client.disconnect(), true);

  const packager = new DatastorePackager(`${__dirname}/datastores/remoteExtractor.js`);
  await packager.build();
  await client.upload(await packager.dbx.tarGzip());
  remoteVersion = packager.manifest.version;
  remoteDatastoreId = packager.manifest.id;
});

beforeEach(() => {
  mock.MicronoteBatchFunding.verifyBatch.mockClear();
  mock.MicronoteBatchFunding.fundBatch.mockClear();
  mock.sidechainClient.sendRequest.mockClear();
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
  expect(meta.extractorsByName.pass.minimumPrice).toBe(405);
});

test('should be able to add charges from multiple extractors', async () => {
  apiCalls.mockReset();
  holdAmounts.length = 0;
  const address1 = Address.createFromSigningIdentities([Identity.createSync()]);
  let version: string;
  let datastoreId: string;
  {
    Fs.writeFileSync(
      `${__dirname}/datastores/source.js`,
      `
const Datastore = require('@ulixee/datastore');
const { boolean, string } = require('@ulixee/schema');

export default new Datastore({
  paymentAddress: '${address1.bech32}',
  extractors: {
    source: new Datastore.Extractor({
      pricePerQuery: 6,
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
    await dbx.build({ createTemporaryVersion: true });
    Helpers.onClose(() => Fs.promises.unlink(`${__dirname}/datastores/source.js`));
    Helpers.onClose(() =>
      Fs.promises.rm(`${__dirname}/datastores/source.dbx`, { recursive: true }),
    );
    await new DatastoreApiClient(await cloudNode.address).upload(await dbx.dbx.tarGzip());
    version = dbx.manifest.version;
    datastoreId = dbx.manifest.id;
    expect(dbx.manifest.paymentAddress).toBeTruthy();
    const price = await client.getExtractorPricing(datastoreId, version, 'source');
    expect(price.minimumPrice).toBe(6 + 5);
  }

  {
    Fs.writeFileSync(
      `${__dirname}/datastores/hop1.js`,
      `
const Datastore = require('@ulixee/datastore');
const { boolean, string } = require('@ulixee/schema');

export default new Datastore({
  paymentAddress: '${address1.bech32}',
  remoteDatastores: {
    hop0: 'ulx://${await cloudNode.address}/${datastoreId}@v${version}',
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
    datastoreId = dbx.manifest.id;
    const price = await client.getExtractorPricing(datastoreId, version, 'source2');
    expect(price.minimumPrice).toBe(6 + 5 + 11);
  }

  Fs.writeFileSync(
    `${__dirname}/datastores/hop2.js`,
    `
const Datastore = require('@ulixee/datastore');
const { boolean, string } = require('@ulixee/schema');

export default new Datastore({
  paymentAddress: '${address1.bech32}',
  remoteDatastores: {
    hop1: 'ulx://${await cloudNode.address}/${datastoreId}@v${version}',
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

  const price = await client.getExtractorPricing(
    lastHop.manifest.id,
    lastHop.manifest.version,
    'last',
  );
  expect(price.minimumPrice).toBe(3 + 11 + 6 + 5);

  const clientIdentity = Identity.createSync();
  const sidechainClient = new SidechainClient('http://localhost:1337', {
    identity: clientIdentity,
    address: Address.createFromSigningIdentities([clientIdentity]),
  });
  const payment = await sidechainClient.createMicroPayment({
    microgons: price.minimumPrice,
    ...price,
  });
  const result = await client.query(
    lastHop.manifest.id,
    lastHop.manifest.version,
    'select * from last()',
    {
      payment,
    },
  );
  expect(result.outputs[0].calls).toBe(3);
  expect(result.outputs[0].lastRun).toBe('hop2');

  // reverse order of holds
  expect(holdAmounts).toEqual([3, 11, 6]);
  const apiCommands = apiCalls.mock.calls.map(x => ({ command: x[0].command, args: x[0].args }));
  expect(apiCommands.filter(x => x.command === 'Micronote.hold')).toHaveLength(3);
  expect(
    apiCommands.filter(x => x.command === 'Micronote.hold' && x.args.holdAuthorizationCode),
  ).toHaveLength(2);
  expect(apiCommands.filter(x => x.command === 'Micronote.settle')).toHaveLength(3);
  expect(apiCommands.filter(x => x.command === 'Micronote.settle' && x.args.isFinal)).toHaveLength(
    1,
  );
});

const holdAmounts: number[] = [];
let holdCounter = 0;
async function mockSidechainServer(message: ICoreRequestPayload<ISidechainApis, any>) {
  const { command, args } = message;
  apiCalls(message);
  if (command === 'Sidechain.settings') {
    return {
      // built to handle more than one key if we need to rotate one out
      rootIdentities: [sidechainIdentity.bech32],
      identityProofSignatures: [
        sidechainIdentity.sign(sha256(concatAsBuffer(command, (args as any)?.identity))),
      ],
      latestBlockSettings: {
        height: 0,
        sidechains: [{ rootIdentity: sidechainIdentity.bech32, url: 'http://localhost:1337' }],
      } as IBlockSettings,
      batchDurationMinutes: 60 * 60e3 * 8,
      settlementFeeMicrogons: 5,
      version: '1.0.0',
    } as ISidechainInfoApis['Sidechain.settings']['result'];
  }
  if (command === 'Micronote.hold') {
    const holdArgs = args as IMicronoteApis['Micronote.hold']['args'];
    holdAmounts.push(holdArgs.microgons);
    return {
      accepted: true,
      holdId: `123${(holdCounter += 1)}`.padEnd(30, '0'),
      holdAuthorizationCode: holdCounter === 1 ? '123'.padEnd(16, '1') : undefined,
    } as IMicronoteApis['Micronote.hold']['result'];
  }
  if (command === 'Micronote.settle') {
    const payments = Object.values(
      (args as IMicronoteApis['Micronote.settle']['args']).tokenAllocation,
    ).reduce((x, t) => x + t, 0);
    return { finalCost: payments + 5 } as IMicronoteApis['Micronote.settle']['result'];
  }
  if (command === 'MicronoteBatch.findFund') {
    return {};
  }
  if (command === 'Sidechain.openBatches') {
    return {
      micronote: [
        {
          batchSlug,
          minimumFundingCentagons: 1n,
          micronoteBatchIdentity: batchIdentity.bech32,
          sidechainIdentity: sidechainIdentity.bech32,
          sidechainValidationSignature: sidechainIdentity.sign(sha256(batchIdentity.bech32)),
        },
      ],
    } as ISidechainInfoApis['Sidechain.openBatches']['result'];
  }
  if (command === 'Micronote.create') {
    const id = encodeBuffer(sha256('micronoteId'), 'mcr');
    const mcrBatchSlug = (args as any).batchSlug;
    return {
      batchSlug: mcrBatchSlug,
      id,
      blockHeight: 0,
      guaranteeBlockHeight: 0,
      fundsId: '1'.padEnd(30, '0'),
      fundMicrogonsRemaining: args.microgons,
      micronoteSignature: batchIdentity.sign(sha256(concatAsBuffer(id, args.microgons))),
    } as IMicronoteApis['Micronote.create']['result'];
  }
  throw new Error(`unknown request ${command}`);
}
