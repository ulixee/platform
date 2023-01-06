import * as Fs from 'fs';
import * as Path from 'path';
import DatastorePackager from '@ulixee/datastore-packager';
import UlixeeMiner from '@ulixee/miner';
import Identity from '@ulixee/crypto/lib/Identity';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
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
import IDatastoreManifest from '@ulixee/specification/types/IDatastoreManifest';
import ISidechainInfoApis from '@ulixee/specification/sidechain/SidechainInfoApis';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import Ed25519 from '@ulixee/crypto/lib/Ed25519';
import GiftCards from '@ulixee/sidechain/lib/GiftCards';
import DatastoreCore from '../index';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'DatastorePayments.test');

let miner: UlixeeMiner;
let client: DatastoreApiClient;
const sidechainIdentity = Identity.createSync();
const batchIdentity = Identity.createSync();
const giftCardBatchIdentity = Identity.createSync();
const clientIdentity = Identity.createSync();
const batchSlug = 'micro_12345123';
const giftCardBatchSlug = 'gifts_12345123';

const address = Address.createFromSigningIdentities([clientIdentity]);
const minerIdentity = Identity.createSync();
const minerGiftCardIssuer = Identity.createSync();

const apiCalls = jest.fn();
DatastoreCore.options.identityWithSidechain = Identity.createSync();
DatastoreCore.options.defaultSidechainHost = 'http://localhost:1337';
DatastoreCore.options.defaultSidechainRootIdentity = sidechainIdentity.bech32;
DatastoreCore.options.giftCardsRequiredIssuerIdentity = minerGiftCardIssuer.bech32;
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

beforeAll(async () => {
  if (Fs.existsSync(`${__dirname}/datastores/output-manifest.json`)) {
    Fs.unlinkSync(`${__dirname}/datastores/output-manifest.json`);
  }

  if (Fs.existsSync(`${__dirname}/datastores/output.dbx`)) {
    Fs.unlinkSync(`${__dirname}/datastores/output.dbx`);
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
});

beforeEach(() => {
  mock.MicronoteBatchFunding.verifyBatch.mockClear();
  mock.MicronoteBatchFunding.fundBatch.mockClear();
  mock.sidechainClient.sendRequest.mockClear();
});

afterAll(async () => {
  await miner.close();
  if (Fs.existsSync(storageDir)) Fs.rmSync(storageDir, { recursive: true });
});

test('should be able to run a datastore function with payments', async () => {
  apiCalls.mockClear();
  const packager = new DatastorePackager(`${__dirname}/datastores/output.js`);
  await Fs.writeFileSync(
    `${__dirname}/datastores/output-manifest.json`,
    JSON.stringify({
      paymentAddress: encodeBuffer(sha3('payme123'), 'ar'),
      functionsByName: {
        putout: {
          prices: [
            {
              perQuery: 1250,
            },
          ],
        },
      },
    } as Partial<IDatastoreManifest>),
  );

  const dbx = await packager.build();
  const manifest = packager.manifest;
  expect(manifest.functionsByName.putout.prices[0].perQuery).toBe(1250);
  await client.upload(await dbx.asBuffer());

  await expect(client.query(manifest.versionHash, 'SELECT * FROM putout()')).rejects.toThrowError(
    'requires payment',
  );
  await expect(client.stream(manifest.versionHash, 'putout', {})).rejects.toThrowError(
    'requires payment',
  );
  const sidechainClient = new SidechainClient('http://localhost:1337', {
    identity: clientIdentity,
    address,
  });
  const settings = await sidechainClient.getSettings(false);
  expect(settings.settlementFeeMicrogons).toBe(5);
  apiCalls.mockClear();

  const meta = await client.getFunctionPricing(manifest.versionHash, 'putout');
  const payment = await sidechainClient.createMicroPayment({
    microgons: meta.minimumPrice,
    ...meta,
  });
  expect(payment.micronote.microgons).toBeGreaterThanOrEqual(1255);

  expect(apiCalls.mock.calls.map(x => x[0].command)).toEqual([
    'Sidechain.settings',
    'Sidechain.openBatches',
    'MicronoteBatch.findFund',
    'Micronote.create',
  ]);

  apiCalls.mockClear();
  await expect(
    client.query(manifest.versionHash, 'SELECT success FROM putout()', { payment }),
  ).resolves.toEqual({
    outputs: [{ success: true }],
    metadata: {
      microgons: 1255,
      bytes: expect.any(Number),
      milliseconds: expect.any(Number),
    },
    latestVersionHash: expect.any(String),
  });
  expect(apiCalls.mock.calls.map(x => x[0].command)).toEqual([
    // from DatastoreCore
    'Sidechain.settings',
    'Micronote.hold',
    'Micronote.settle',
  ]);
  // @ts-ignore
  const registry = DatastoreCore.datastoreRegistry;
  const entry = registry.getByVersionHash(manifest.versionHash);
  expect(entry.statsByFunction.putout.runs).toBe(1);
  expect(entry.statsByFunction.putout.maxPrice).toBe(1250);

  const streamed = client.stream(manifest.versionHash, 'putout', {}, { payment });
  await expect(streamed.resultMetadata).resolves.toEqual({
    metadata: {
      microgons: 1255,
      bytes: expect.any(Number),
      milliseconds: expect.any(Number),
    },
    latestVersionHash: expect.any(String),
  });
});

test('should be able run a datastore with a GiftCard', async () => {
  apiCalls.mockClear();
  const packager = new DatastorePackager(`${__dirname}/datastores/output.js`);
  const datastoreGiftCardIssuer = Identity.createSync();
  await Fs.writeFileSync(
    `${__dirname}/datastores/output-manifest.json`,
    JSON.stringify({
      paymentAddress: encodeBuffer(sha3('payme123'), 'ar'),
      giftCardIssuerIdentity: datastoreGiftCardIssuer.bech32,
      functionsByName: {
        putout: {
          prices: [{ perQuery: 1000 }],
        },
      },
    } as Partial<IDatastoreManifest>),
  );

  const dbx = await packager.build();
  const manifest = packager.manifest;
  await client.upload(await dbx.asBuffer());

  const devSidechainClient = new SidechainClient('http://localhost:1337', {
    identity: datastoreGiftCardIssuer,
  });
  giftCardIssuerIdentities = [minerGiftCardIssuer.bech32, datastoreGiftCardIssuer.bech32];
  const giftCardDraft = await devSidechainClient.giftCards.createUnsaved(
    5000,
    giftCardIssuerIdentities,
  );
  const giftCard = await devSidechainClient.giftCards.save(
    devSidechainClient.giftCards.signWithIssuers(giftCardDraft, minerGiftCardIssuer),
  );

  const userSidechainClient = new SidechainClient('http://localhost:1337', {
    identity: clientIdentity,
    address,
  });
  const giftCardBalance = await userSidechainClient.giftCards.store(
    giftCard.giftCardId,
    giftCard.redemptionKey,
  );
  expect(giftCardBalance.microgonsRemaining).toBe(5000);

  const meta = await client.getFunctionPricing(manifest.versionHash, 'putout');
  expect(meta.giftCardIssuerIdentities).toHaveLength(2);

  // should be able to run with a gift card required issuer
  {
    const payment = await userSidechainClient.createMicroPayment({
      microgons: meta.minimumPrice,
      ...meta,
    });
    expect(payment.giftCard.id).toBe(giftCard.giftCardId);
    await expect(
      client.query(manifest.versionHash, 'SELECT success FROM putout()', { payment }),
    ).resolves.toEqual({
      outputs: [{ success: true }],
      metadata: expect.any(Object),
      latestVersionHash: expect.any(String),
    });
  }
  // should be able to run with no gift card required issuer
  {
    DatastoreCore.options.giftCardsRequiredIssuerIdentity = null;
    const payment = await userSidechainClient.createMicroPayment({
      microgons: meta.minimumPrice,
      ...meta,
    });
    expect(payment.giftCard.id).toBe(giftCard.giftCardId);
    await expect(
      client.query(manifest.versionHash, 'SELECT success FROM putout()', { payment }),
    ).resolves.toEqual({
      outputs: [{ success: true }],
      metadata: expect.any(Object),
      latestVersionHash: expect.any(String),
    });

    const streamed = client.stream(manifest.versionHash, 'putout', {}, { payment });
    await expect(streamed.resultMetadata).resolves.toEqual({
      metadata: expect.any(Object),
      latestVersionHash: expect.any(String),
    });
  }

  // follow-on test that you can disable giftCards
  DatastoreCore.options.giftCardsAllowed = false;
  const payment = await userSidechainClient.createMicroPayment({
    microgons: meta.minimumPrice,
    ...meta,
  });
  expect(payment.giftCard).toBeTruthy()
  await expect(
    client.query(manifest.versionHash, 'SELECT * FROM putout()', { payment }),
  ).rejects.toThrowError('not accepting gift cards');
  DatastoreCore.options.giftCardsAllowed = true;
});

test('should remove an empty GiftCard', async () => {
  apiCalls.mockClear();
  const packager = new DatastorePackager(`${__dirname}/datastores/output.js`);
  await Fs.writeFileSync(
    `${__dirname}/datastores/output-manifest.json`,
    JSON.stringify({
      functionsByName: {
        putout: {
          prices: [{ perQuery: 1250 }],
        },
      },
      paymentAddress: encodeBuffer(sha3('payme123'), 'ar'),
      giftCardIssuerIdentity: minerGiftCardIssuer.bech32,
    } as Partial<IDatastoreManifest>),
  );

  DatastoreCore.options.giftCardsRequiredIssuerIdentity = null;
  const dbx = await packager.build();
  const manifest = packager.manifest;
  await client.upload(await dbx.asBuffer());

  const devSidechainClient = new SidechainClient('http://localhost:1337', {
    identity: minerIdentity,
  });
  const giftCard = await devSidechainClient.giftCards.create(5000);

  const userSidechainClient = new SidechainClient('http://localhost:1337', {
    identity: clientIdentity,
    address,
  });
  const giftCardBalance = await userSidechainClient.giftCards.store(
    giftCard.giftCardId,
    giftCard.redemptionKey,
  );
  expect(giftCardBalance.microgonsRemaining).toBe(5000);

  const meta = await client.getFunctionPricing(manifest.versionHash, 'putout');
  expect(meta.giftCardIssuerIdentities).toHaveLength(1);

  const payment = await userSidechainClient.createMicroPayment({
    ...meta,
    microgons: meta.minimumPrice,
  });
  expect(payment.giftCard.id).toBe(giftCard.giftCardId);
  emptyGiftCardId = payment.giftCard.id;

  expect(userSidechainClient.giftCards.byId[emptyGiftCardId]).toBeTruthy();
  await expect(
    client.query(manifest.versionHash, 'SELECT * FROM putout()', { payment }),
  ).rejects.toThrowError();
  expect(userSidechainClient.giftCards.byId[emptyGiftCardId]).not.toBeTruthy();
});

let emptyGiftCardId: string = null;
let giftCardIssuerIdentities: string[] = [minerGiftCardIssuer.bech32];

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
    return {
      accepted: true,
      holdId: '1234'.padEnd(30, '0'),
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
      fundsId: '1'.padEnd(30, '0'),
      fundMicrogonsRemaining: 5000,
      micronoteSignature: identity.sign(sha3(concatAsBuffer(id, args.microgons))),
    } as IMicronoteApis['Micronote.create']['result'];
  }
  if (command === 'GiftCard.get') {
    return {
      balance: args.giftCardId === emptyGiftCardId ? 0 : 5000,
      id: args.giftCardId,
      issuerIdentities: giftCardIssuerIdentities,
    } as IGiftCardApis['GiftCard.get']['result'];
  }
  if (command === 'MicronoteBatch.activeFunds') {
    const funds = [] as IMicronoteBatchApis['MicronoteBatch.activeFunds']['result'];
    if ((args as any).batchSlug === giftCardBatchSlug) {
      funds.push({
        fundsId: '1'.padEnd(30, '0'),
        allowedRecipientAddresses: [],
        microgonsRemaining: 5000,
      });
    }
    return funds;
  }
  if (command === 'GiftCard.create') {
    const key = Ed25519.getPrivateKeyBytes((await Ed25519.create()).privateKey);
    const giftCardId = nanoid(12);
    return {
      batchSlug,
      giftCardId,
      redemptionKey: encodeBuffer(key, 'gft'),
    } as IGiftCardApis['GiftCard.create']['result'];
  }

  if (command === 'GiftCard.createHold') {
    if (args.giftCardId === emptyGiftCardId) {
      const error: any = new Error('Insufficient Funds Error');
      error.code = 'ERR_NSF';
      throw error;
    }
    return {
      holdId: nanoid(32),
      remainingBalance: 10,
    } as IGiftCardApis['GiftCard.createHold']['result'];
  }
  if (command === 'GiftCard.settleHold') {
    return {
      remainingBalance: 10,
      microgonsAllowed: args.microgons,
      success: true,
    } as IGiftCardApis['GiftCard.settleHold']['result'];
  }
  throw new Error(`unknown request ${command}`);
}
