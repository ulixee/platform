"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const keyring_1 = require("@polkadot/keyring");
const hashUtils_1 = require("@ulixee/commons/lib/hashUtils");
const utils_1 = require("@ulixee/commons/lib/utils");
const datastore_testing_1 = require("@ulixee/datastore-testing");
const BrokerEscrowSource_1 = require("@ulixee/datastore/payments/BrokerEscrowSource");
const LocalchainWithSync_1 = require("@ulixee/datastore/payments/LocalchainWithSync");
const localchain_1 = require("@ulixee/localchain");
const net_1 = require("@ulixee/net");
const Identity_1 = require("@ulixee/platform-utils/lib/Identity");
const Fs = require("node:fs");
const Path = require("node:path");
const serdeJson_1 = require("@ulixee/platform-utils/lib/serdeJson");
const index_1 = require("../index");
const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'broker.api.test');
beforeAll(async () => {
    jest.spyOn(LocalchainWithSync_1.default.prototype, 'load').mockImplementation(() => Promise.resolve());
    jest.spyOn(LocalchainWithSync_1.default.prototype, 'timeForTick').mockImplementation(ticks => new Date());
    const account = new keyring_1.Keyring().addFromUri('//Alice');
    jest.spyOn(LocalchainWithSync_1.default.prototype, 'transactions', 'get').mockImplementation(() => {
        return {
            createEscrow: async () => {
                return {
                    escrow: {
                        id: 'test',
                        settledAmount: 0n,
                        expirationTick: 0,
                    },
                    exportForSend: async () => {
                        return (0, serdeJson_1.default)({
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
                                    dataDomainHash: (0, hashUtils_1.sha256)('test.flights'),
                                },
                            },
                        });
                    },
                };
            },
        };
    });
});
beforeEach(() => {
    if (Fs.existsSync(storageDir))
        Fs.rmSync(storageDir, { recursive: true });
});
afterEach(datastore_testing_1.Helpers.afterEach);
afterAll(datastore_testing_1.Helpers.afterAll);
it('can create escrows', async () => {
    const broker = new index_1.default({ storageDir });
    datastore_testing_1.Helpers.needsClosing.push(broker);
    await broker.listen();
    await broker.listenAdmin(0);
    const identity = await Identity_1.default.create();
    await registerUser(broker, identity);
    const brokerHost = (0, utils_1.toUrl)(await broker.host, 'http:');
    const datastoreKeyPair = new keyring_1.Keyring({
        ss58Format: localchain_1.ADDRESS_PREFIX,
    }).createFromUri('//Bob');
    const client = new BrokerEscrowSource_1.default(brokerHost.href, identity);
    broker.getApiContext('').datastoreWhitelist.add('test.flights');
    const escrow = await client.createEscrow({
        host: '127.0.0.1',
        microgons: 50,
        recipient: {
            address: datastoreKeyPair.address,
            notaryId: 1,
        },
        id: 'test',
        version: '1.0.0',
        domain: 'test.flights',
    }, 100n);
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
    });
    expect(db.escrows.countOpen()).toBe(0);
    expect(db.escrows.pendingBalance()).toBe(0n);
    expect(db.organizations.list()[0].balance).toBe(20n);
});
test('it rejects invalid signing requests', async () => {
    const broker = new index_1.default({ storageDir });
    datastore_testing_1.Helpers.needsClosing.push(broker);
    await broker.listen();
    await broker.listenAdmin(0);
    const identity = await Identity_1.default.create();
    await registerUser(broker, identity);
    const brokerHost = (0, utils_1.toUrl)(await broker.host, 'http:');
    broker.getApiContext('').datastoreWhitelist.add('test.flights');
    const datastoreKeyPair = new keyring_1.Keyring({
        ss58Format: localchain_1.ADDRESS_PREFIX,
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
    const client = new BrokerEscrowSource_1.default(brokerHost.href, await Identity_1.default.create());
    await expect(client.createEscrow(paymentInfo, 100n)).rejects.toThrow('Organization not found');
    jest
        .spyOn(BrokerEscrowSource_1.default, 'createSignatureMessage')
        .mockImplementationOnce(() => (0, hashUtils_1.sha256)('bad data'));
    const client2 = new BrokerEscrowSource_1.default(brokerHost.href, identity);
    await expect(client2.createEscrow(paymentInfo, 100n)).rejects.toThrow('Invalid signature');
});
async function registerUser(dataBroker, identity) {
    const adminUrl = await dataBroker.adminHost;
    const adminTransport = new net_1.WsTransportToCore(adminUrl.replace('http:', 'ws:'));
    const adminConnection = new net_1.ConnectionToCore(adminTransport);
    datastore_testing_1.Helpers.onClose(() => adminConnection.disconnect());
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
//# sourceMappingURL=api.test.js.map