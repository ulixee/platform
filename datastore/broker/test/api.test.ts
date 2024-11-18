import { Keyring } from '@argonprotocol/mainchain';
import { sha256 } from '@ulixee/commons/lib/hashUtils';
import { toUrl } from '@ulixee/commons/lib/utils';
import { Helpers } from '@ulixee/datastore-testing';
import BrokerChannelHoldSource from '@ulixee/datastore/payments/BrokerChannelHoldSource';
import LocalchainWithSync from '@ulixee/datastore/payments/LocalchainWithSync';
import { ADDRESS_PREFIX, Chain } from '@argonprotocol/localchain';
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
      createChannelHold: async () => {
        return {
          channelHold: {
            id: 'test',
            settledAmount: 0n,
            expirationTick: 0,
          },
          exportForSend: async () => {
            return serdeJson(<IBalanceChange>{
              accountId: account.address,
              changeNumber: 0,
              balance: 100000n,
              notes: [{ microgons: 5000n, noteType: { action: 'channelHoldSettle' } }],
              signature: Buffer.from(account.sign(Buffer.from('test'), { withType: true })),
              microgons: '100',
              previousBalanceProof: null,
              accountType: 'deposit',
              channelHoldNote: {
                microgons: 100000n,
                noteType: {
                  action: 'channelHold',
                  recipient: account.address,
                  domainHash: sha256('test.flights'),
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

const mainchainIdentity = {
  chain: Chain.Devnet,
  genesisHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
};

it('can create channelHolds', async () => {
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

  const client = new BrokerChannelHoldSource(brokerHost.href, identity);
  broker.getApiContext('').datastoreWhitelist.add('test.flights');
  const channelHold = await client.createChannelHold(
    {
      host: '127.0.0.1',
      microgons: 100_000n,
      recipient: {
        address: datastoreKeyPair.address,
        notaryId: 1,
        ...mainchainIdentity,
      },
      id: 'test',
      version: '1.0.0',
      domain: 'test.flights',
    },
    100_000n,
  );
  expect(channelHold.channelHoldId).toBeTruthy();
  expect(channelHold.balanceChange.channelHoldNote.microgons).toBe(100_000n);

  const db = broker.getApiContext('').db;
  expect(db.channelHolds.countOpen()).toBe(1);
  expect(db.channelHolds.pendingBalance()).toBe(100_000n);
  expect(db.organizations.list()[0].balance).toBe(0n);
  expect(db.organizations.list()[0].balanceInChannelHolds).toBe(100_000n);

  await broker.onLocalchainSync({
    channelHoldNotarizations: [
      {
        channelHolds: [
          {
            id: channelHold.channelHoldId,
            settledAmount: 80n,
          },
        ],
      },
    ],
  } as any);
  expect(db.channelHolds.countOpen()).toBe(0);
  expect(db.channelHolds.pendingBalance()).toBe(0n);
  expect(db.organizations.list()[0].balance).toBe(99920n);
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
    microgons: 50n,
    recipient: {
      address: datastoreKeyPair.address,
      notaryId: 1,
      ...mainchainIdentity,
    },
    id: 'test',
    version: '1.0.0',
    domain: 'test.flights',
  };

  const client = new BrokerChannelHoldSource(brokerHost.href, await Identity.create());
  await expect(client.createChannelHold(paymentInfo, 100n)).rejects.toThrow(
    'Organization not found',
  );

  jest
    .spyOn(BrokerChannelHoldSource, 'createSignatureMessage')
    .mockImplementationOnce(() => sha256('bad data'));
  const client2 = new BrokerChannelHoldSource(brokerHost.href, identity);
  await expect(client2.createChannelHold(paymentInfo, 100n)).rejects.toThrow('Invalid signature');
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
        balance: 100_000n,
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
