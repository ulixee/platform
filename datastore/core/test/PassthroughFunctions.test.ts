import * as Fs from 'fs';
import * as Path from 'path';
import DatastorePackager from '@ulixee/datastore-packager';
import UlixeeMiner from '@ulixee/miner';
import Identity from '@ulixee/crypto/lib/Identity';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { Helpers } from '@ulixee/datastore-testing';
import { concatAsBuffer, encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import { sha3 } from '@ulixee/commons/lib/hashUtils';
import MicronoteBatchFunding from '@ulixee/sidechain/lib/MicronoteBatchFunding';
import ArgonUtils from '@ulixee/sidechain/lib/ArgonUtils';
import SidechainClient from '@ulixee/sidechain';
import ICoreRequestPayload from '@ulixee/net/interfaces/ICoreRequestPayload';
import { ISidechainApis } from '@ulixee/specification/sidechain';
import IMicronoteApis from '@ulixee/specification/sidechain/MicronoteApis';
import { IBlockSettings } from '@ulixee/specification';
import ISidechainInfoApis from '@ulixee/specification/sidechain/SidechainInfoApis';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import Address from '@ulixee/crypto/lib/Address';
import GiftCards from '@ulixee/sidechain/lib/GiftCards';
import DatastoreCore from '../index';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'PassthroughFunctions.test');

let miner: UlixeeMiner;
let client: DatastoreApiClient;
const sidechainIdentity = Identity.createSync();
const batchIdentity = Identity.createSync();
const giftCardBatchIdentity = Identity.createSync();
const batchSlug = 'micro_12345123';

const apiCalls = jest.fn();
DatastoreCore.options.identityWithSidechain = Identity.createSync();
DatastoreCore.options.defaultSidechainHost = 'http://localhost:1337';
DatastoreCore.options.defaultSidechainRootIdentity = sidechainIdentity.bech32;
DatastoreCore.options.approvedSidechains = [
  { rootIdentity: sidechainIdentity.bech32, url: 'http://localhost:1337' },
];
jest.spyOn(GiftCards.prototype, 'saveToDisk').mockImplementation(() => null);
jest.spyOn(GiftCards.prototype, 'getStored').mockImplementation(() => Promise.resolve({}));
jest.spyOn<any, any>(UlixeeHostsConfig.global, 'save').mockImplementation(() => null);

const mock = {
  sidechainClient: {
    sendRequest: jest.spyOn<any, any>(SidechainClient.prototype, 'sendRequest'),
  },
  MicronoteBatchFunding: {
    verifyBatch: jest.spyOn<any, any>(MicronoteBatchFunding.prototype, 'verifyBatch'),
    fundBatch: jest.spyOn(MicronoteBatchFunding.prototype, 'fundBatch'),
  },
};

let remoteVersionHash: string;
beforeAll(async () => {
  for (const file of [
    'remoteFunction.dbx',
    'passthroughFunction.js',
    'passthroughFunction.dbx',
    'passthroughFunctionUpcharge.js',
    'passthroughFunctionUpcharge.dbx',
  ]) {
    if (Fs.existsSync(`${__dirname}/datastores/${file}`)) {
      Fs.unlinkSync(`${__dirname}/datastores/${file}`);
    }
  }

  mock.MicronoteBatchFunding.fundBatch.mockImplementation(async function (batch, centagons) {
    return this.recordBatchFund(
      '1'.padEnd(30, '0'),
      ArgonUtils.centagonsToMicrogons(centagons),
      batch,
    );
  });

  mock.sidechainClient.sendRequest.mockImplementation(mockSidechainServer);

  miner = new UlixeeMiner();
  miner.router.datastoreConfiguration = { datastoresDir: storageDir };
  await miner.listen();
  client = new DatastoreApiClient(await miner.address);

  const packager = new DatastorePackager(`${__dirname}/datastores/remoteFunction.js`);
  await packager.build();
  await client.upload(await packager.dbx.asBuffer());
  remoteVersionHash = packager.manifest.versionHash;
});

beforeEach(() => {
  mock.MicronoteBatchFunding.verifyBatch.mockClear();
  mock.MicronoteBatchFunding.fundBatch.mockClear();
  mock.sidechainClient.sendRequest.mockClear();
});

afterEach(Helpers.afterEach);

afterAll(async () => {
  await miner.close();
  await Helpers.afterAll();
  Fs.rmSync(storageDir, { recursive: true });
});

test('should be able to have a passthrough function', async () => {
  await expect(client.stream(remoteVersionHash, 'remote', { test: '123d' })).resolves.toEqual([
    { iAmRemote: true, echo: '123d' },
  ]);

  Fs.writeFileSync(
    `${__dirname}/datastores/passthroughFunction.js`,
    `const Datastore = require('@ulixee/datastore');
const { boolean, string } = require('@ulixee/schema');

export default new Datastore({
  remoteDatastores: {
    source: 'ulx://${await miner.address}/${remoteVersionHash}',
  },
  functions: {
    pass: new Datastore.PassthroughFunction({
      remoteFunction: 'source.remote',
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

  const passthrough = new DatastorePackager(`${__dirname}/datastores/passthroughFunction.js`);
  await passthrough.build();
  await client.upload(await passthrough.dbx.asBuffer());

  await expect(
    client.stream(passthrough.manifest.versionHash, 'pass', { test: '123d' }),
  ).resolves.toEqual([{ iAmRemote: true, echo: '123d', addOn: 'phew' }]);
});

test('should re-emit output automatically if no onResponse is provided', async () => {
  await expect(client.stream(remoteVersionHash, 'remote', { test: '123d' })).resolves.toEqual([
    { iAmRemote: true, echo: '123d' },
  ]);

  Fs.writeFileSync(
    `${__dirname}/datastores/passthroughFunctionNoOnresponse.js`,
    `const Datastore = require('@ulixee/datastore');
const { boolean, string } = require('@ulixee/schema');

export default new Datastore({
  remoteDatastores: {
    source: 'ulx://${await miner.address}/${remoteVersionHash}',
  },
  functions: {
    pass: new Datastore.PassthroughFunction({
      remoteFunction: 'source.remote',
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
    `${__dirname}/datastores/passthroughFunctionNoOnresponse.js`,
  );
  await passthrough.build();
  await client.upload(await passthrough.dbx.asBuffer());

  await expect(
    client.stream(passthrough.manifest.versionHash, 'pass', { test: '123d' }),
  ).resolves.toEqual([{ iAmRemote: true, echo: '123d' }]);
});

test('should be able to add upcharge to a function', async () => {
  Fs.writeFileSync(
    `${__dirname}/datastores/passthroughFunctionUpcharge.js`,
    `
const Datastore = require('@ulixee/datastore');
const { boolean, string } = require('@ulixee/schema');

export default new Datastore({
  remoteDatastores: {
    source: 'ulx://${await miner.address}/${remoteVersionHash}',
  },
  functions: {
    pass: new Datastore.PassthroughFunction({
      upcharge: 400,
      remoteFunction: 'source.remote',
      async onResponse({ stream, Output }) {
        for await (const output of stream) {
           Output.emit({ ...output, addOn: 'phew '})
        }
      },
    }),
  },
});`,
  );

  const passthrough = new DatastorePackager(`${__dirname}/datastores/passthroughFunctionUpcharge.js`);
  await passthrough.build();
  await client.upload(await passthrough.dbx.asBuffer());

  const meta = await client.getMeta(passthrough.manifest.versionHash);
  expect(meta.functionsByName.pass.minimumPrice).toBe(405);
});

test('should be able to add charges from multiple functions', async () => {
  apiCalls.mockReset();
  holdAmounts.length = 0;
  const address1 = Address.createFromSigningIdentities([Identity.createSync()]);
  let versionHash: string;
  {
    Fs.writeFileSync(
      `${__dirname}/datastores/source.js`,
      `
const Datastore = require('@ulixee/datastore');
const { boolean, string } = require('@ulixee/schema');

export default new Datastore({
  paymentAddress: '${address1.bech32}',
  functions: {
    source: new Datastore.Function({
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
    await dbx.build();
    Helpers.onClose(() => Fs.promises.unlink(`${__dirname}/datastores/source.js`));
    Helpers.onClose(() => Fs.promises.unlink(`${__dirname}/datastores/source.dbx`));
    await new DatastoreApiClient(await miner.address).upload(await dbx.dbx.asBuffer());
    versionHash = dbx.manifest.versionHash;
    expect(dbx.manifest.paymentAddress).toBeTruthy();
    const price = await client.getFunctionPricing(versionHash, 'source');
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
    hop0: 'ulx://${await miner.address}/${versionHash}',
  },
  functions: {
    source2: new Datastore.PassthroughFunction({
      upcharge: 11,
      remoteFunction: 'hop0.source',
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
    Helpers.onClose(() => Fs.promises.unlink(`${__dirname}/datastores/hop1.dbx`));
    await dbx.build();
    await new DatastoreApiClient(await miner.address).upload(await dbx.dbx.asBuffer());
    versionHash = dbx.manifest.versionHash;
    const price = await client.getFunctionPricing(versionHash, 'source2');
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
    hop1: 'ulx://${await miner.address}/${versionHash}',
  },
  functions: {
    last: new Datastore.PassthroughFunction({
      upcharge: 3,
      remoteFunction: 'hop1.source2',
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
  await lastHop.build();
  await client.upload(await lastHop.dbx.asBuffer());

  const price = await client.getFunctionPricing(lastHop.manifest.versionHash, 'last');
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
  const result = await client.query(lastHop.manifest.versionHash, 'select * from last()', {
    payment,
  });
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
        sidechainIdentity.sign(sha3(concatAsBuffer(command, (args as any)?.identity))),
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
          isGiftCardBatch: false,
          micronoteBatchIdentity: batchIdentity.bech32,
          sidechainIdentity: sidechainIdentity.bech32,
          sidechainValidationSignature: sidechainIdentity.sign(sha3(batchIdentity.bech32)),
        },
      ],
    } as ISidechainInfoApis['Sidechain.openBatches']['result'];
  }
  if (command === 'Micronote.create') {
    const id = encodeBuffer(sha3('micronoteId'), 'mcr');
    const mcrBatchSlug = (args as any).batchSlug;
    const identity = mcrBatchSlug.startsWith('gifts') ? giftCardBatchIdentity : batchIdentity;
    return {
      batchSlug: mcrBatchSlug,
      id,
      blockHeight: 0,
      guaranteeBlockHeight: 0,
      fundsId: '1'.padEnd(30, '0'),
      fundMicrogonsRemaining: args.microgons,
      micronoteSignature: identity.sign(sha3(concatAsBuffer(id, args.microgons))),
    } as IMicronoteApis['Micronote.create']['result'];
  }
  throw new Error(`unknown request ${command}`);
}
