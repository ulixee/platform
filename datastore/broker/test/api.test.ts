import { Keyring } from '@polkadot/keyring';
import { sha256 } from '@ulixee/commons/lib/hashUtils';
import { toUrl } from '@ulixee/commons/lib/utils';
import { Helpers } from '@ulixee/datastore-testing';
import BrokerEscrowSource from '@ulixee/datastore/payments/BrokerEscrowSource';
import LocalchainWithSync from '@ulixee/datastore/payments/LocalchainWithSync';
import { ADDRESS_PREFIX } from '@ulixee/localchain';
import { ConnectionToCore, WsTransportToCore } from '@ulixee/net';
import { IDatabrokerAdminApis } from '@ulixee/platform-specification/datastore';
import Identity from '@ulixee/platform-utils/lib/Identity';
import * as Fs from 'node:fs';
import * as Path from 'node:path';
import serdeJson from '@ulixee/platform-utils/lib/serdeJson';
import IBalanceChange from '@ulixee/platform-specification/types/IBalanceChange';
import DataBroker from '../index';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'broker.api.test');

beforeAll(async () => {
  jest.spyOn(LocalchainWithSync.prototype, 'load').mockImplementation(() => Promise.resolve());
  jest.spyOn(LocalchainWithSync.prototype, 'timeForTick').mockImplementation(ticks => new Date());

  const account = new Keyring().addFromUri('//Alice');
  jest.spyOn(LocalchainWithSync.prototype, 'transactions', 'get').mockImplementation(() => {
    return {
      createEscrow: async () => {
        return {
          escrow: {
            id: 'test',
            settledAmount: 0n,
            expirationTick: 0,
          },
          exportForSend: async () => {
            return serdeJson(<IBalanceChange>{
              accountId: account.address,
              changeNumber: 0,
              balance: 100n,
              notes: [{ milligons: 5n, noteType: { action: 'escrowSettle' } }],
              signature: Buffer.from(account.sign(Buffer.from('test'), { withType: true })),
              milligons: '100',
              previousBalanceProof: null,
              accountType: 'deposit',
              escrowHoldNote: {
                milligons: 100n,
                noteType: {
                  action: 'escrowHold',
                  recipient: account.address,
                  dataDomainHash: sha256('test.flights'),
                },
              },
            });
          },
        };
      },
    } as any;
  });
});
beforeEach(() => {
  if (Fs.existsSync(storageDir)) Fs.rmSync(storageDir, { recursive: true });
});

afterEach(Helpers.afterEach);
afterAll(Helpers.afterAll);

it('can create escrows', async () => {
  const broker = new DataBroker({ storageDir });
  Helpers.needsClosing.push(broker);
  await broker.listen();
  await broker.listenAdmin(0);

  const identity = await Identity.create();
  await registerUser(broker, identity);
  const brokerHost = toUrl(await broker.host, 'http:');

  const datastoreKeyPair = new Keyring({
    ss58Format: ADDRESS_PREFIX,
  }).createFromUri('//Bob');

  const client = new BrokerEscrowSource(brokerHost.href, identity);
  broker.getApiContext('').datastoreWhitelist.add('test.flights');
  const escrow = await client.createEscrow(
    {
      host: '127.0.0.1',
      microgons: 50,
      recipient: {
        address: datastoreKeyPair.address,
        notaryId: 1,
      },
      id: 'test',
      version: '1.0.0',
      domain: 'test.flights',
    },
    100n,
  );
  expect(escrow.escrowId).toBeTruthy();
  expect(escrow.balanceChange.escrowHoldNote.milligons).toBe(100n);

  const db = broker.getApiContext('').db;
  expect(db.escrows.countOpen()).toBe(1);
  expect(db.escrows.pendingBalance()).toBe(100n);
  expect(db.organizations.list()[0].balance).toBe(0n);
  expect(db.organizations.list()[0].balanceInEscrows).toBe(100n);

  await broker.onLocalchainSync({
    escrowNotarizations: [
      {
        escrows: [{
          id: escrow.escrowId,
          settledAmount: 80n,
        }],
      },
    ],
  } as any);
  expect(db.escrows.countOpen()).toBe(0);
  expect(db.escrows.pendingBalance()).toBe(0n);
  expect(db.organizations.list()[0].balance).toBe(20n);
});

test('it rejects invalid signing requests', async () => {
  const broker = new DataBroker({ storageDir });
  Helpers.needsClosing.push(broker);
  await broker.listen();
  await broker.listenAdmin(0);

  const identity = await Identity.create();
  await registerUser(broker, identity);
  const brokerHost = toUrl(await broker.host, 'http:');
  broker.getApiContext('').datastoreWhitelist.add('test.flights');

  const datastoreKeyPair = new Keyring({
    ss58Format: ADDRESS_PREFIX,
  }).createFromUri('//Bob');

  const paymentInfo = {
    host: '127.0.0.1',
    microgons: 50,
    recipient: {
      address: datastoreKeyPair.address,
      notaryId: 1,
    },
    id: 'test',
    version: '1.0.0',
    domain: 'test.flights',
  };

  const client = new BrokerEscrowSource(brokerHost.href, await Identity.create());
  await expect(client.createEscrow(paymentInfo, 100n)).rejects.toThrow('Organization not found');

  jest
    .spyOn(BrokerEscrowSource, 'createSignatureMessage')
    .mockImplementationOnce(() => sha256('bad data'));
  const client2 = new BrokerEscrowSource(brokerHost.href, identity);
  await expect(client2.createEscrow(paymentInfo, 100n)).rejects.toThrow('Invalid signature');
});

async function registerUser(dataBroker: DataBroker, identity: Identity) {
  const adminUrl = await dataBroker.adminHost;

  const adminTransport = new WsTransportToCore(adminUrl.replace('http:', 'ws:'));
  const adminConnection = new ConnectionToCore<IDatabrokerAdminApis, any>(adminTransport);
  Helpers.onClose(() => adminConnection.disconnect());
  await adminConnection.connect();
  const response = adminConnection.sendRequest({
    command: 'Organization.create',
    args: [
      {
        name: 'test',
        balance: 100n,
      },
    ],
  });
  await expect(response).resolves.toMatchObject({ id: expect.any(String) });

  const { id } = await response;
  const userResponse = await adminConnection.sendRequest({
    command: 'User.create',
    args: [
      {
        name: 'test',
        identity: identity.bech32,
        organizationId: id,
      },
    ],
  });
  expect(userResponse).toEqual({
    success: true,
  });
  await adminConnection.disconnect();
}
