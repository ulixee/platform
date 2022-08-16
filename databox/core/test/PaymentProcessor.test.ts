import SidechainClient from '@ulixee/sidechain';
import Identity from '@ulixee/crypto/lib/Identity';
import Log from '@ulixee/commons/lib/Logger';
import { sha3 } from '@ulixee/commons/lib/hashUtils';
import { concatAsBuffer } from '@ulixee/commons/lib/bufferUtils';
import PaymentProcessor from '../lib/PaymentProcessor';

const { log } = Log(module);

const identitySpy = jest.spyOn(Identity, 'verify');
const sidechainIdentity = Identity.createSync();
const micronoteBatchIdentity = Identity.createSync();
const sidechainClient = new SidechainClient('123', {});
const lockSpy = jest.spyOn(sidechainClient, 'lockMicronote');
const claimSpy = jest.spyOn(sidechainClient, 'claimMicronote');

const payment = {
  microgons: 1000,
  sidechainIdentity: sidechainIdentity.bech32,
  micronoteBatchIdentity: micronoteBatchIdentity.bech32,
  guaranteeBlockHeight: 0,
  micronoteSignature: micronoteBatchIdentity.sign(sha3(concatAsBuffer('1', 1000))),
  isGiftCardBatch: false,
  micronoteId: '1',
  batchSlug: '123',
  blockHeight: 0,
  micronoteBatchUrl: '',
  sidechainValidationSignature: sidechainIdentity.sign(sha3(micronoteBatchIdentity.bech32)),
};

test('it should ensure a payment has enough microgons', async () => {
  const processor = new PaymentProcessor(
    {
      microgons: 100,
      sidechainIdentity,
      isGiftCardBatch: false,
    } as any,
    {
      anticipatedBytesPerQuery: 100,
      approvedSidechainRootIdentities: new Set([sidechainIdentity.bech32]),
      cachedResultDiscount: 0.2,
    },
    sidechainClient,
    5,
    { height: 0 } as any,
    log,
  );
  processor.addAddressPayable('ar1', { pricePerQuery: 96 });
  await expect(processor.lock()).rejects.toThrowError('insufficient');
});

test('it should allow adding multiple payees', async () => {
  identitySpy.mockReset();
  const processor = new PaymentProcessor(
    payment,
    {
      anticipatedBytesPerQuery: 100,
      approvedSidechainRootIdentities: new Set([sidechainIdentity.bech32]),
      cachedResultDiscount: 0.2,
    },
    sidechainClient,
    5,
    { height: 0 } as any,
    log,
  );
  processor.addAddressPayable('ar1', { pricePerQuery: 500 });
  processor.addAddressPayable('ar2', { pricePerQuery: 100, pricePerKb: 1 });
  lockSpy.mockImplementationOnce(() => Promise.resolve({ accepted: true } as any));
  await expect(processor.lock()).resolves.toBe(true);

  expect(lockSpy).toHaveBeenCalledTimes(1);
  expect(identitySpy).toHaveBeenCalledTimes(2);
});

test('it should allow an address to pay per kb (for dynamic pricing)', async () => {
  const processor = new PaymentProcessor(
    payment,
    {
      anticipatedBytesPerQuery: 100,
      approvedSidechainRootIdentities: new Set([sidechainIdentity.bech32]),
      cachedResultDiscount: 0.2,
    },
    sidechainClient,
    5,
    { height: 0 } as any,
    log,
  );
  processor.addAddressPayable('ar1', { pricePerQuery: 500 });
  processor.addAddressPayable('ar2', { pricePerQuery: 100, pricePerKb: 1 });
  lockSpy.mockImplementationOnce(() => Promise.resolve({ accepted: true } as any));
  claimSpy.mockImplementationOnce(() => Promise.resolve({ finalCost: 605 }));
  await expect(processor.lock()).resolves.toBe(true);

  const finalMicrogons = await processor.claim(10);
  expect(finalMicrogons).toBe(605);
  expect(claimSpy).toHaveBeenCalledTimes(1);
  expect(claimSpy).toHaveBeenCalledWith('1', '123', { ar1: 500, ar2: 110 });
});

test('the processor should take all available funds if a query exceeds the microgon allocation', async () => {
  const processor = new PaymentProcessor(
    payment,
    {
      anticipatedBytesPerQuery: 100,
      approvedSidechainRootIdentities: new Set([sidechainIdentity.bech32]),
      cachedResultDiscount: 0.2,
    },
    sidechainClient,
    5,
    { height: 0 } as any,
    log,
  );
  lockSpy.mockImplementationOnce(() => Promise.resolve({ accepted: true } as any));
  claimSpy.mockImplementationOnce(() => Promise.resolve({ finalCost: 605 }));
  claimSpy.mockClear();
  await expect(processor.lock()).resolves.toBe(true);

  processor.addAddressPayable('ar1', { pricePerQuery: 500 });
  processor.addAddressPayable('ar2', { pricePerQuery: 500 });
  await expect(processor.claim(10)).rejects.toThrowError('will not cover');
  expect(claimSpy).toHaveBeenCalledTimes(1);
  expect(claimSpy).toHaveBeenCalledWith('1', '123', { ar1: 500, ar2: 495 });
});
