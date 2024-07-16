"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const keyring_1 = require("@polkadot/keyring");
const hosts_1 = require("@ulixee/commons/config/hosts");
const datastore_packager_1 = require("@ulixee/datastore-packager");
const datastore_testing_1 = require("@ulixee/datastore-testing");
const DatastoreApiClient_1 = require("@ulixee/datastore/lib/DatastoreApiClient");
const ArgonReserver_1 = require("@ulixee/datastore/payments/ArgonReserver");
const CreditReserver_1 = require("@ulixee/datastore/payments/CreditReserver");
const Fs = require("fs");
const Path = require("path");
const EscrowSpendTracker_1 = require("../lib/EscrowSpendTracker");
const _MockEscrowSpendTracker_1 = require("./_MockEscrowSpendTracker");
const _MockPaymentService_1 = require("./_MockPaymentService");
const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'DatastorePayments.test');
let cloudNode;
let client;
jest.spyOn(hosts_1.default.global, 'save').mockImplementation(() => null);
let storageCounter = 0;
const keyring = new keyring_1.Keyring({ ss58Format: 18 });
const datastoreKeyring = keyring.createFromUri('Datastore');
const escrowSpendTrackerMock = new _MockEscrowSpendTracker_1.default();
const escrowSpendTracker = new EscrowSpendTracker_1.default(storageDir, null);
let manifest;
beforeAll(async () => {
    if (Fs.existsSync(`${__dirname}/datastores/payments-manifest.json`)) {
        Fs.unlinkSync(`${__dirname}/datastores/payments-manifest.json`);
    }
    if (Fs.existsSync(`${__dirname}/datastores/payments.dbx`)) {
        Fs.rmSync(`${__dirname}/datastores/payments.dbx`, { recursive: true });
    }
    Fs.writeFileSync(`${__dirname}/datastores/payments-manifest.json`, JSON.stringify({
        version: '0.0.1',
        payment: {
            address: datastoreKeyring.address,
            notaryId: 1,
        },
        extractorsByName: {
            testPayments: {
                prices: [
                    {
                        basePrice: 1250,
                    },
                ],
            },
        },
        tablesByName: {
            titleNames: {
                prices: [
                    {
                        basePrice: 100,
                    },
                ],
            },
            successTitles: {
                prices: [
                    {
                        basePrice: 150,
                    },
                ],
            },
        },
    }));
    const packager = new datastore_packager_1.default(`${__dirname}/datastores/payments.js`);
    const dbx = await packager.build();
    manifest = packager.manifest;
    cloudNode = await datastore_testing_1.Helpers.createLocalNode({
        datastoreConfiguration: {
            datastoresDir: storageDir,
            datastoresTmpDir: Path.join(storageDir, 'tmp'),
        },
    }, true);
    cloudNode.datastoreCore.escrowSpendTracker = escrowSpendTracker;
    client = new DatastoreApiClient_1.default(await cloudNode.address, { consoleLogErrors: true });
    await client.upload(await dbx.tarGzip());
    datastore_testing_1.Helpers.onClose(() => client.disconnect(), true);
});
beforeEach(() => {
    storageCounter += 1;
    ArgonReserver_1.default.baseStorePath = Path.join(storageDir, `payments-${storageCounter}`);
    CreditReserver_1.default.defaultBasePath = Path.join(storageDir, `credits-${storageCounter}`);
    escrowSpendTrackerMock.clear();
});
afterEach(datastore_testing_1.Helpers.afterEach);
afterAll(datastore_testing_1.Helpers.afterAll);
test('should be able to run a datastore function with payments', async () => {
    expect(manifest.extractorsByName.testPayments.prices[0].basePrice).toBe(1250);
    const price = await client.pricing.getEntityPrice(manifest.id, manifest.version, 'testPayments');
    expect(price).toBe(1250);
    await expect(client.query(manifest.id, manifest.version, 'SELECT * FROM testPayments()')).rejects.toThrow('requires payment');
    await expect(client.stream(manifest.id, manifest.version, 'testPayments', {})).rejects.toThrow('requires payment');
    const clientAddress = keyring.createFromUri('client');
    const paymentService = new _MockPaymentService_1.default(clientAddress, client);
    escrowSpendTrackerMock.mock(datastoreId => {
        const escrowId = paymentService.paymentsByDatastoreId[datastoreId].escrowId;
        const escrow = paymentService.escrowsById[escrowId];
        return {
            id: escrowId,
            expirationTick: escrow.tick + 100,
            holdAmount: escrow.escrowHoldAmount,
        };
    });
    await expect(client.query(manifest.id, manifest.version, 'SELECT success FROM testPayments()', {
        paymentService,
    })).resolves.toEqual({
        outputs: [{ success: true }],
        metadata: {
            microgons: 1250,
            bytes: expect.any(Number),
            milliseconds: expect.any(Number),
        },
        latestVersion: expect.any(String),
        queryId: expect.any(String),
    });
    // @ts-ignore
    const statsTracker = cloudNode.datastoreCore.statsTracker;
    const entry = await statsTracker.getForDatastoreVersion(manifest);
    expect(entry.stats.queries).toBe(3);
    expect(entry.stats.errors).toBe(2);
    expect(entry.stats.maxPricePerQuery).toBe(1250);
    expect(entry.statsByEntityName.testPayments.stats.queries).toBe(1);
    expect(entry.statsByEntityName.testPayments.stats.maxPricePerQuery).toBe(1250);
    const streamed = client.stream(manifest.id, manifest.version, 'testPayments', {}, { paymentService });
    await expect(streamed.resultMetadata).resolves.toEqual({
        outputs: [{ success: true }],
        metadata: {
            microgons: 1250,
            bytes: expect.any(Number),
            milliseconds: expect.any(Number),
        },
        latestVersion: expect.any(String),
        queryId: expect.any(String),
    });
    // @ts-expect-error
    const dbs = escrowSpendTracker.escrowDbsByDatastore;
    expect(dbs.size).toBe(1);
    // @ts-expect-error
    expect(dbs.get(manifest.id).paymentIdByEscrowId.size).toBe(1);
    expect(dbs.get(manifest.id).list()).toEqual([
        expect.objectContaining({
            expirationDate: expect.any(Date),
            id: paymentService.paymentsByDatastoreId[manifest.id].escrowId,
            allocated: 5000,
            remaining: 5000 - 1250 - 1250,
        }),
    ]);
});
test('can collect payments from multiple tables and functions', async () => {
    const sql = `select name from titleNames t 
        join successTitles s on s.title = t.title 
        where s.success = (select success from testPayments())`;
    const price = await client.pricing.getQueryPrice(manifest.id, manifest.version, sql);
    expect(price).toBe(1250 + 150 + 100);
    const clientAddress = keyring.createFromUri('client');
    const paymentService = new _MockPaymentService_1.default(clientAddress, client);
    escrowSpendTrackerMock.mock(datastoreId => {
        const escrowId = paymentService.paymentsByDatastoreId[datastoreId].escrowId;
        const escrow = paymentService.escrowsById[escrowId];
        return {
            id: escrowId,
            expirationTick: escrow.tick + 100,
            holdAmount: escrow.escrowHoldAmount,
        };
    });
    await expect(client.query(manifest.id, manifest.version, sql, {
        paymentService,
    })).resolves.toEqual({
        outputs: [{ name: 'Blake' }],
        metadata: {
            microgons: 1250 + 150 + 100,
            bytes: expect.any(Number),
            milliseconds: expect.any(Number),
        },
        latestVersion: expect.any(String),
        queryId: expect.any(String),
    });
    // @ts-expect-error
    const dbs = escrowSpendTracker.escrowDbsByDatastore;
    expect(dbs.size).toBe(1);
    // @ts-expect-error
    expect(dbs.get(manifest.id).paymentIdByEscrowId.size).toBe(2);
    expect(dbs.get(manifest.id).list()[1]).toEqual(expect.objectContaining({
        allocated: 5000,
        remaining: 5000 - (1250 + 150 + 100),
    }));
});
test('records a changed payment correctly', async () => {
    const clientAddress = keyring.createFromUri('client');
    const paymentService = new _MockPaymentService_1.default(clientAddress, client);
    escrowSpendTrackerMock.mock(datastoreId => {
        const escrowId = paymentService.paymentsByDatastoreId[datastoreId].escrowId;
        const escrow = paymentService.escrowsById[escrowId];
        return {
            id: escrowId,
            expirationTick: escrow.tick + 100,
            holdAmount: escrow.escrowHoldAmount,
        };
    });
    const streamed = client.stream(manifest.id, manifest.version, 'testPayments', { explode: true }, { paymentService });
    await expect(streamed.resultMetadata).resolves.toEqual({
        outputs: undefined,
        runError: expect.any(Error),
        metadata: {
            microgons: 0,
            bytes: expect.any(Number),
            milliseconds: expect.any(Number),
        },
        latestVersion: expect.any(String),
        queryId: expect.any(String),
    });
    // @ts-expect-error
    const dbs = escrowSpendTracker.escrowDbsByDatastore;
    expect(dbs.size).toBe(1);
    // @ts-expect-error
    expect(dbs.get(manifest.id).paymentIdByEscrowId.size).toBe(3);
    expect(dbs.get(manifest.id).list()[2]).toEqual(expect.objectContaining({
        expirationDate: expect.any(Date),
        id: paymentService.paymentsByDatastoreId[manifest.id].escrowId,
        allocated: 5000,
        remaining: 5000,
    }));
});
test.todo('should not double charge for storage and tables');
//# sourceMappingURL=DatastorePayments.test.js.map