import * as Fs from 'fs';
import * as Path from 'path';
import DataboxPackager from '@ulixee/databox-packager';
import UlixeeServer from '@ulixee/server';
import Identity from '@ulixee/crypto/lib/Identity';
import DataboxApiClient from '@ulixee/databox/lib/DataboxApiClient';
import { concatAsBuffer, encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import { sha3 } from '@ulixee/commons/lib/hashUtils';
import MicronoteBatchFunding from '@ulixee/sidechain/lib/MicronoteBatchFunding';
import SidechainClient from '@ulixee/sidechain';
import ICoreRequestPayload from '@ulixee/net/interfaces/ICoreRequestPayload';
import { ISidechainApis } from '@ulixee/specification/sidechain';
import IMicronoteApis from '@ulixee/specification/sidechain/MicronoteApis';
import Address from '@ulixee/crypto/lib/Address';
import IMicronoteBatchApis from '@ulixee/specification/sidechain/MicronoteBatchApis';
import ISidechainSettingsApis from '@ulixee/specification/sidechain/SidechainSettingsApis';
import { IBlockSettings } from '@ulixee/specification';
import ICreditApis from '@ulixee/specification/sidechain/CreditApis';
import { nanoid } from 'nanoid';
import IDataboxManifest from '@ulixee/specification/types/IDataboxManifest';
import DataboxCore from '../index';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Databox.run.test');

let server: UlixeeServer;
let client: DataboxApiClient;
const sidechainIdentity = Identity.createSync();
const batchIdentity = Identity.createSync();
const creditBatchIdentity = Identity.createSync();
const clientIdentity = Identity.createSync();
const batchSlug = 'micro_12345123';
const creditBatchSlug = 'credit_1234512';

const address = Address.createFromSigningIdentities([clientIdentity]);
const serverIdentity = Identity.createSync();
const serverCreditsAddress = Address.createFromSigningIdentities([serverIdentity]);

const apiCalls = jest.fn();
DataboxCore.options.identityWithSidechain = Identity.createSync();
DataboxCore.options.creditsAddress = serverCreditsAddress.bech32;
DataboxCore.options.defaultSidechainHost = 'http://localhost:1337';
DataboxCore.options.defaultSidechainRootIdentity = sidechainIdentity.bech32;
DataboxCore.options.approvedSidechains = [
  { rootIdentity: sidechainIdentity.bech32, url: 'http://localhost:1337' },
];

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
    return this.recordBatchFund(1, centagons * 10e3, batch);
  });

  mock.sidechainClient.sendRequest.mockImplementation(mockSidechainServer);

  server = new UlixeeServer();
  server.router.databoxConfiguration = { databoxesDir: storageDir };
  await server.listen();
  client = new DataboxApiClient(await server.address);
});

beforeEach(() => {
  mock.MicronoteBatchFunding.verifyBatch.mockClear();
  mock.MicronoteBatchFunding.fundBatch.mockClear();
  mock.sidechainClient.sendRequest.mockClear();
});

afterAll(async () => {
  Fs.rmdirSync(storageDir, { recursive: true });
  await server.close();
});

test('should be able run a databox', async () => {
  const packager = new DataboxPackager(`${__dirname}/databoxes/output.js`);
  await packager.build();
  await client.upload(await packager.dbx.asBuffer());
  await expect(client.run(packager.manifest.versionHash, null)).resolves.toEqual({
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
  await client.upload(await dbx.asBuffer());

  await expect(client.run(manifest.versionHash, null)).rejects.toThrowError('requires payment');
  const sidechainClient = new SidechainClient('http://localhost:1337', {
    identity: clientIdentity,
    address,
  });

  const meta = await client.getMeta(manifest.versionHash);

  const payment = await sidechainClient.createMicroPayment(meta);
  expect(payment.microgons).toBeGreaterThan(1250);

  expect(apiCalls.mock.calls.map(x => x[0].command)).toEqual([
    'Sidechain.settings',
    'MicronoteBatch.get',
    'MicronoteBatch.activeFunds',
    'MicronoteBatch.findFund',
    'Micronote.create',
  ]);

  apiCalls.mockClear();

  await expect(client.run(manifest.versionHash, null, payment)).resolves.toEqual({
    output: { success: true },
    metadata: expect.any(Object),
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

test('should be able run a databox with a credit', async () => {
  apiCalls.mockClear();
  const packager = new DataboxPackager(`${__dirname}/databoxes/output.js`);
  await Fs.writeFileSync(
    `${__dirname}/databoxes/output-manifest.json`,
    JSON.stringify({
      paymentAddress: encodeBuffer(sha3('payme123'), 'ar'),
      creditsAddress: serverCreditsAddress.bech32,
      pricePerQuery: 1250,
    } as IDataboxManifest),
  );

  const dbx = await packager.build();
  const manifest = packager.manifest;
  await client.upload(await dbx.asBuffer());

  const devSidechainClient = new SidechainClient('http://localhost:1337', {
    identity: serverIdentity,
    address: serverCreditsAddress,
  });
  const credit = await devSidechainClient.createCredit(5000);

  const userSidechainClient = new SidechainClient('http://localhost:1337', {
    identity: clientIdentity,
    address,
  });
  const micronote = await userSidechainClient.claimCredit(credit.creditId, credit.batchSlug);
  expect(micronote.batchSlug).toBe(creditBatchSlug);
  expect(micronote.isCreditBatch).toBe(true);

  const meta = await client.getMeta(manifest.versionHash);
  expect(meta.creditPaymentAddresses).toHaveLength(1);

  const payment = await userSidechainClient.createMicroPayment(meta);
  expect(payment.microgons).toBeGreaterThan(1250);
  expect(payment.isCreditBatch).toBe(true);
  await expect(client.run(manifest.versionHash, null, payment)).resolves.toEqual({
    output: { success: true },
    metadata: expect.any(Object),
    latestVersionHash: expect.any(String),
  });

  // follow-on test that you can disable credits
  DataboxCore.options.creditsAddress = null;
  await expect(client.run(manifest.versionHash, null, payment)).rejects.toThrowError(
    'not accepting credits',
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
    } as ISidechainSettingsApis['Sidechain.settings']['result'];
  }
  if (command === 'Micronote.lock') {
    return { accepted: true } as IMicronoteApis['Micronote.lock']['result'];
  }
  if (command === 'Micronote.claim') {
    return { finalCost: 80 } as IMicronoteApis['Micronote.claim']['result'];
  }
  if (command === 'MicronoteBatch.findFund') {
    return {};
  }
  if (command === 'MicronoteBatch.get') {
    return {
      active: {
        batchSlug,
        isCreditBatch: false,
        micronoteBatchIdentity: batchIdentity.bech32,
        sidechainIdentity: sidechainIdentity.bech32,
        sidechainValidationSignature: sidechainIdentity.sign(sha3(batchIdentity.bech32)),
      },
      credit: {
        batchSlug: creditBatchSlug,
        isCreditBatch: true,
        micronoteBatchIdentity: creditBatchIdentity.bech32,
        sidechainIdentity: sidechainIdentity.bech32,
        sidechainValidationSignature: sidechainIdentity.sign(sha3(creditBatchIdentity.bech32)),
      },
    } as IMicronoteBatchApis['MicronoteBatch.get']['result'];
  }
  if (command === 'Micronote.create') {
    const id = encodeBuffer(sha3('micronoteId'), 'mcr');
    const mcrBatchSlug = (args as any).batchSlug;
    const identity = mcrBatchSlug.startsWith('credit') ? creditBatchIdentity : batchIdentity;
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
  if (command === 'Credit.claim') {
    return {
      microgons: 5000,
      fundsId: 1,
      allowedRecipientAddresses: [serverCreditsAddress.bech32],
    } as ICreditApis['Credit.claim']['result'];
  }
  if (command === 'MicronoteBatch.activeFunds') {
    const funds = [] as IMicronoteBatchApis['MicronoteBatch.activeFunds']['result'];
    if ((args as any).batchSlug === creditBatchSlug) {
      funds.push({
        fundsId: 1,
        allowedRecipientAddresses: [serverCreditsAddress.bech32],
        microgonsRemaining: 5000,
      });
    }
    return funds;
  }
  if (command === 'Credit.create') {
    const creditId = nanoid(32);
    return {
      batchSlug,
      creditId,
      blockHeight: 0,
      guaranteeBlockHeight: 0,
      fundsId: 1,
      fundMicrogonsRemaining: 5000,
      micronoteSignature: creditBatchIdentity.sign(
        sha3(concatAsBuffer(creditId, (args as any).microgons)),
      ),
      sidechainIdentity: sidechainIdentity.bech32,
      sidechainValidationSignature: sidechainIdentity.sign(sha3(creditBatchIdentity.bech32)),
    } as ICreditApis['Credit.create']['result'];
  }
  throw new Error(`unknown request ${command}`);
}
