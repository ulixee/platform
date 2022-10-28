import * as Fs from 'fs';
import * as Path from 'path';
import DataboxPackager from '@ulixee/databox-packager';
import UlixeeMiner from '@ulixee/miner';
import Identity from '@ulixee/crypto/lib/Identity';
import DataboxApiClient from '@ulixee/databox/lib/DataboxApiClient';
import { concatAsBuffer, encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import { sha3 } from '@ulixee/commons/lib/hashUtils';
import MicronoteBatchFunding from '@ulixee/sidechain/lib/MicronoteBatchFunding';
import ArgonUtils from '@ulixee/sidechain/lib/ArgonUtils';
import SidechainClient from '@ulixee/sidechain';
import ICoreRequestPayload from '@ulixee/net/interfaces/ICoreRequestPayload';
import { ISidechainApis } from '@ulixee/specification/sidechain';
import IMicronoteApis from '@ulixee/specification/sidechain/MicronoteApis';
import Address from '@ulixee/crypto/lib/Address';
import IMicronoteBatchApis from '@ulixee/specification/sidechain/MicronoteBatchApis';
import { IBlockSettings } from '@ulixee/specification';
import IGiftCardApis from '@ulixee/specification/sidechain/GiftCardApis';
import { nanoid } from 'nanoid';
import IDataboxManifest from '@ulixee/specification/types/IDataboxManifest';
import ISidechainInfoApis from '@ulixee/specification/sidechain/SidechainInfoApis';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import DataboxCore from '../index';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Databox.exec.test');

let miner: UlixeeMiner;
let client: DataboxApiClient;
const sidechainIdentity = Identity.createSync();
const batchIdentity = Identity.createSync();
const giftCardBatchIdentity = Identity.createSync();
const clientIdentity = Identity.createSync();
const batchSlug = 'micro_12345123';
const giftCardBatchSlug = 'gifts_12345123';

const address = Address.createFromSigningIdentities([clientIdentity]);
const minerIdentity = Identity.createSync();
const minerGiftCardAddress = Address.createFromSigningIdentities([minerIdentity]);

const apiCalls = jest.fn();
DataboxCore.options.identityWithSidechain = Identity.createSync();
DataboxCore.options.giftCardAddress = minerGiftCardAddress.bech32;
DataboxCore.options.defaultSidechainHost = 'http://localhost:1337';
DataboxCore.options.defaultSidechainRootIdentity = sidechainIdentity.bech32;
DataboxCore.options.approvedSidechains = [
  { rootIdentity: sidechainIdentity.bech32, url: 'http://localhost:1337' },
];

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

beforeAll(async () => {
  if (Fs.existsSync(`${__dirname}/databoxes/output-manifest.json`)) {
    Fs.unlinkSync(`${__dirname}/databoxes/output-manifest.json`);
  }
  if (Fs.existsSync(`${__dirname}/databoxes/output.dbx`)) {
    Fs.unlinkSync(`${__dirname}/databoxes/output.dbx`);
  }
  mock.MicronoteBatchFunding.fundBatch.mockImplementation(async function (batch, centagons) {
    return this.recordBatchFund(1, ArgonUtils.centagonsToMicrogons(centagons), batch);
  });

  mock.sidechainClient.sendRequest.mockImplementation(mockSidechainServer);

  miner = new UlixeeMiner();
  miner.router.databoxConfiguration = { databoxesDir: storageDir };
  await miner.listen();
  client = new DataboxApiClient(await miner.address);
});

beforeEach(() => {
  mock.MicronoteBatchFunding.verifyBatch.mockClear();
  mock.MicronoteBatchFunding.fundBatch.mockClear();
  mock.sidechainClient.sendRequest.mockClear();
});

afterAll(async () => {
  Fs.rmdirSync(storageDir, { recursive: true });
  await miner.close();
});

test('should be able run a databox', async () => {
  const packager = new DataboxPackager(`${__dirname}/databoxes/output.js`);
  await packager.build();
  await client.upload(await packager.dbx.asBuffer());
  await expect(client.exec(packager.manifest.versionHash, null)).resolves.toEqual({
    output: { success: true },
    metadata: expect.any(Object),
    latestVersionHash: expect.any(String),
  });
});

test('should be able run a databox with payments', async () => {
  apiCalls.mockClear();
  const packager = new DataboxPackager(`${__dirname}/databoxes/output.js`);
  await Fs.writeFileSync(
    `${__dirname}/databoxes/output-manifest.json`,
    JSON.stringify({
      paymentAddress: encodeBuffer(sha3('payme123'), 'ar'),
      pricePerQuery: 1250,
    }),
  );

  const dbx = await packager.build();
  const manifest = packager.manifest;
  expect(manifest.pricePerQuery).toBe(1250);
  await client.upload(await dbx.asBuffer());

  await expect(client.exec(manifest.versionHash, null)).rejects.toThrowError('requires payment');
  const sidechainClient = new SidechainClient('http://localhost:1337', {
    identity: clientIdentity,
    address,
  });
  const settings = await sidechainClient.getSettings(false);
  expect(settings.settlementFeeMicrogons).toBe(5);

  const meta = await client.getMeta(manifest.versionHash);

  const payment = await sidechainClient.createMicroPayment(meta);
  expect(payment.microgons).toBeGreaterThanOrEqual(1255);

  expect(apiCalls.mock.calls.map(x => x[0].command)).toEqual([
    'Sidechain.settings',
    'Sidechain.openBatches',
    'MicronoteBatch.activeFunds',
    'MicronoteBatch.findFund',
    'Micronote.create',
  ]);

  apiCalls.mockClear();

  await expect(client.exec(manifest.versionHash, null, payment)).resolves.toEqual({
    output: { success: true },
    metadata: {
      microgons: 1255,
      bytes: expect.any(Number),
      milliseconds: expect.any(Number),
    },
    latestVersionHash: expect.any(String),
  });
  expect(apiCalls.mock.calls.map(x => x[0].command)).toEqual([
    // from DataboxCore
    'Sidechain.settings',
    'Micronote.lock',
    'Micronote.claim',
  ]);
  // @ts-ignore
  const registry = DataboxCore.databoxRegistry;
  const entry = registry.getByVersionHash(manifest.versionHash);
  expect(entry.stats.runs).toBe(1);
  expect(entry.stats.maxPrice).toBe(1255);
});

test('should be able run a databox with a GiftCard', async () => {
  apiCalls.mockClear();
  const packager = new DataboxPackager(`${__dirname}/databoxes/output.js`);
  await Fs.writeFileSync(
    `${__dirname}/databoxes/output-manifest.json`,
    JSON.stringify({
      paymentAddress: encodeBuffer(sha3('payme123'), 'ar'),
      giftCardAddress: minerGiftCardAddress.bech32,
      pricePerQuery: 1250,
    } as IDataboxManifest),
  );

  const dbx = await packager.build();
  const manifest = packager.manifest;
  await client.upload(await dbx.asBuffer());

  const devSidechainClient = new SidechainClient('http://localhost:1337', {
    identity: minerIdentity,
    address: minerGiftCardAddress,
  });
  const giftCard = await devSidechainClient.createGiftCard(5000);

  const userSidechainClient = new SidechainClient('http://localhost:1337', {
    identity: clientIdentity,
    address,
  });
  const micronote = await userSidechainClient.claimGiftCard(
    giftCard.giftCardId,
    giftCard.batchSlug,
  );
  expect(micronote.batchSlug).toBe(giftCardBatchSlug);
  expect(micronote.isGiftCardBatch).toBe(true);

  const meta = await client.getMeta(manifest.versionHash);
  expect(meta.giftCardPaymentAddresses).toHaveLength(1);

  const payment = await userSidechainClient.createMicroPayment(meta);
  expect(payment.microgons).toBeGreaterThan(1250);
  expect(payment.isGiftCardBatch).toBe(true);
  await expect(client.exec(manifest.versionHash, null, payment)).resolves.toEqual({
    output: { success: true },
    metadata: expect.any(Object),
    latestVersionHash: expect.any(String),
  });

  // follow-on test that you can disable giftCards
  DataboxCore.options.giftCardAddress = null;
  await expect(client.exec(manifest.versionHash, null, payment)).rejects.toThrowError(
    'not accepting gift cards',
  );
});

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
  if (command === 'Micronote.lock') {
    return { accepted: true } as IMicronoteApis['Micronote.lock']['result'];
  }
  if (command === 'Micronote.claim') {
    const payments = Object.values(
      (args as IMicronoteApis['Micronote.claim']['args']).tokenAllocation,
    ).reduce((x, t) => x + t, 0);
    return { finalCost: payments + 5 } as IMicronoteApis['Micronote.claim']['result'];
  }
  if (command === 'MicronoteBatch.findFund') {
    return {};
  }
  if (command === 'Sidechain.openBatches') {
    return {
      micronote: [{
        batchSlug,
        isGiftCardBatch: false,
        micronoteBatchIdentity: batchIdentity.bech32,
        sidechainIdentity: sidechainIdentity.bech32,
        sidechainValidationSignature: sidechainIdentity.sign(sha3(batchIdentity.bech32)),
      }],
      giftCard: {
        batchSlug: giftCardBatchSlug,
        isGiftCardBatch: true,
        micronoteBatchIdentity: giftCardBatchIdentity.bech32,
        sidechainIdentity: sidechainIdentity.bech32,
        sidechainValidationSignature: sidechainIdentity.sign(sha3(giftCardBatchIdentity.bech32)),
      },
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
      fundsId: 1,
      fundMicrogonsRemaining: 5000,
      micronoteSignature: identity.sign(sha3(concatAsBuffer(id, (args as any).microgons))),
    } as IMicronoteApis['Micronote.create']['result'];
  }
  if (command === 'GiftCard.claim') {
    return {
      microgons: 5000,
      fundsId: 1,
      redeemableWithAddresses: [minerGiftCardAddress.bech32],
    } as IGiftCardApis['GiftCard.claim']['result'];
  }
  if (command === 'MicronoteBatch.activeFunds') {
    const funds = [] as IMicronoteBatchApis['MicronoteBatch.activeFunds']['result'];
    if ((args as any).batchSlug === giftCardBatchSlug) {
      funds.push({
        fundsId: 1,
        allowedRecipientAddresses: [minerGiftCardAddress.bech32],
        microgonsRemaining: 5000,
      });
    }
    return funds;
  }
  if (command === 'GiftCard.create') {
    const giftCardId = nanoid(32);
    return {
      batchSlug,
      giftCardId,
      blockHeight: 0,
      guaranteeBlockHeight: 0,
      fundsId: 1,
      fundMicrogonsRemaining: 5000,
      micronoteSignature: giftCardBatchIdentity.sign(
        sha3(concatAsBuffer(giftCardId, (args as any).microgons)),
      ),
      sidechainIdentity: sidechainIdentity.bech32,
      sidechainValidationSignature: sidechainIdentity.sign(sha3(giftCardBatchIdentity.bech32)),
    } as IGiftCardApis['GiftCard.create']['result'];
  }
  throw new Error(`unknown request ${command}`);
}
