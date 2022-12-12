import * as Fs from 'fs';
import * as Path from 'path';
import DataboxPackager from '@ulixee/databox-packager';
import UlixeeMiner from '@ulixee/miner';
import Identity from '@ulixee/crypto/lib/Identity';
import DataboxApiClient from '@ulixee/databox/lib/DataboxApiClient';
import { Helpers } from '@ulixee/databox-testing';
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
import DataboxCore from '../index';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'PassthroughFunctions.test');

let miner: UlixeeMiner;
let client: DataboxApiClient;
const sidechainIdentity = Identity.createSync();
const batchIdentity = Identity.createSync();
const giftCardBatchIdentity = Identity.createSync();
const batchSlug = 'micro_12345123';

const apiCalls = jest.fn();
DataboxCore.options.identityWithSidechain = Identity.createSync();
DataboxCore.options.defaultSidechainHost = 'http://localhost:1337';
DataboxCore.options.defaultSidechainRootIdentity = sidechainIdentity.bech32;
DataboxCore.options.approvedSidechains = [
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
    if (Fs.existsSync(`${__dirname}/databoxes/${file}`)) {
      Fs.unlinkSync(`${__dirname}/databoxes/${file}`);
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
  miner.router.databoxConfiguration = { databoxesDir: storageDir };
  await miner.listen();
  client = new DataboxApiClient(await miner.address);

  const packager = new DataboxPackager(`${__dirname}/databoxes/remoteFunction.js`);
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
  await expect(
    client.query(remoteVersionHash, 'select * from remote(test => $1)', { boundValues: ['123d'] }),
  ).resolves.toEqual({
    output: [{ iAmRemote: true, echo: '123d' }],
    metadata: expect.any(Object),
    latestVersionHash: expect.any(String),
  });

  Fs.writeFileSync(
    `${__dirname}/databoxes/passthroughFunction.js`,
    `
const Databox = require('@ulixee/databox');
const { boolean, string } = require('@ulixee/schema');

export default new Databox({
  remoteDataboxes: {
    source: 'ulx://${await miner.address}/${remoteVersionHash}',
  },
  functions: {
    pass: new Databox.PassthroughFunction({
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
      afterRun(context) {
        context.output.addOn = 'phew';
      },
    }),
  },
});`,
  );

  const passthrough = new DataboxPackager(`${__dirname}/databoxes/passthroughFunction.js`);
  await passthrough.build();
  await client.upload(await passthrough.dbx.asBuffer());

  await expect(
    client.query(passthrough.manifest.versionHash, 'select * from pass(test => $1)', {
      boundValues: ['123d'],
    }),
  ).resolves.toEqual({
    output: [{ iAmRemote: true, echo: '123d', addOn: 'phew' }],
    metadata: expect.any(Object),
    latestVersionHash: expect.any(String),
  });
});

test('should be able to add upcharge to a function', async () => {
  Fs.writeFileSync(
    `${__dirname}/databoxes/passthroughFunctionUpcharge.js`,
    `
const Databox = require('@ulixee/databox');
const { boolean, string } = require('@ulixee/schema');

export default new Databox({
  remoteDataboxes: {
    source: 'ulx://${await miner.address}/${remoteVersionHash}',
  },
  functions: {
    pass: new Databox.PassthroughFunction({
      upcharge: 400,
      remoteFunction: 'source.remote',
      afterRun(context) {
        context.output.addOn = 'phew';
      },
    }),
  },
});`,
  );

  const passthrough = new DataboxPackager(`${__dirname}/databoxes/passthroughFunctionUpcharge.js`);
  await passthrough.build();
  await client.upload(await passthrough.dbx.asBuffer());

  const meta = await client.getMeta(passthrough.manifest.versionHash);
  expect(meta.functionsByName.pass.minimumPrice).toBe(405);
});

test('should be able to add charge from multiple functions', async () => {
  apiCalls.mockReset();
  holdAmounts.length = 0;
  const address1 = Address.createFromSigningIdentities([Identity.createSync()]);
  let versionHash: string;
  {
    Fs.writeFileSync(
      `${__dirname}/databoxes/source.js`,
      `
const Databox = require('@ulixee/databox');
const { boolean, string } = require('@ulixee/schema');

export default new Databox({
  paymentAddress: '${address1.bech32}',
  functions: {
    source: new Databox.Function({
      pricePerQuery: 6,
      run({ input, output }) {
        output.calls = 1;
        output.lastRun = 'source';
      }
    }),
  },
});`,
    );

    const dbx = new DataboxPackager(`${__dirname}/databoxes/source.js`);
    await dbx.build();
    Helpers.onClose(() => Fs.promises.unlink(`${__dirname}/databoxes/source.js`));
    Helpers.onClose(() => Fs.promises.unlink(`${__dirname}/databoxes/source.dbx`));
    await new DataboxApiClient(await miner.address).upload(await dbx.dbx.asBuffer());
    versionHash = dbx.manifest.versionHash;
    expect(dbx.manifest.paymentAddress).toBeTruthy();
    const price = await client.getFunctionPricing(versionHash, 'source');
    expect(price.minimumPrice).toBe(6 + 5);
  }

  {
    Fs.writeFileSync(
      `${__dirname}/databoxes/hop1.js`,
      `
const Databox = require('@ulixee/databox');
const { boolean, string } = require('@ulixee/schema');

export default new Databox({
  paymentAddress: '${address1.bech32}',
  remoteDataboxes: {
    hop0: 'ulx://${await miner.address}/${versionHash}',
  },
  functions: {
    source2: new Databox.PassthroughFunction({
      upcharge: 11,
      remoteFunction: 'hop0.source',
      afterRun(context) {
        context.output.calls += 1;
        context.output.lastRun = 'hop1';
      },
    }),
  },
});`,
    );

    const dbx = new DataboxPackager(`${__dirname}/databoxes/hop1.js`);
    Helpers.onClose(() => Fs.promises.unlink(`${__dirname}/databoxes/hop1.js`));
    Helpers.onClose(() => Fs.promises.unlink(`${__dirname}/databoxes/hop1.dbx`));
    await dbx.build();
    await new DataboxApiClient(await miner.address).upload(await dbx.dbx.asBuffer());
    versionHash = dbx.manifest.versionHash;
    const price = await client.getFunctionPricing(versionHash, 'source2');
    expect(price.minimumPrice).toBe(6 + 5 + 11);
  }

  Fs.writeFileSync(
    `${__dirname}/databoxes/hop2.js`,
    `
const Databox = require('@ulixee/databox');
const { boolean, string } = require('@ulixee/schema');

export default new Databox({
  paymentAddress: '${address1.bech32}',
  remoteDataboxes: {
    hop1: 'ulx://${await miner.address}/${versionHash}',
  },
  functions: {
    last: new Databox.PassthroughFunction({
      upcharge: 3,
      remoteFunction: 'hop1.source2',
      afterRun(context) {
        context.output.calls += 1;
        context.output.lastRun = 'hop2';
      },
    }),
  },
});`,
  );

  const lastHop = new DataboxPackager(`${__dirname}/databoxes/hop2.js`);
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
  expect(result.output[0].calls).toBe(3);
  expect(result.output[0].lastRun).toBe('hop2');

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
