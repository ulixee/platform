"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const keyring_1 = require("@polkadot/keyring");
const hosts_1 = require("@ulixee/commons/config/hosts");
const datastore_packager_1 = require("@ulixee/datastore-packager");
const datastore_testing_1 = require("@ulixee/datastore-testing");
const cloneDatastore_1 = require("@ulixee/datastore/cli/cloneDatastore");
const DatastoreApiClient_1 = require("@ulixee/datastore/lib/DatastoreApiClient");
const ArgonReserver_1 = require("@ulixee/datastore/payments/ArgonReserver");
const CreditReserver_1 = require("@ulixee/datastore/payments/CreditReserver");
const DefaultPaymentService_1 = require("@ulixee/datastore/payments/DefaultPaymentService");
const Identity_1 = require("@ulixee/platform-utils/lib/Identity");
const Fs = require("fs");
const Path = require("path");
const EscrowSpendTracker_1 = require("../lib/EscrowSpendTracker");
const _MockEscrowSpendTracker_1 = require("./_MockEscrowSpendTracker");
const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Credits.test');
let cloudNode;
let client;
const adminIdentity = Identity_1.default.createSync();
jest.spyOn(hosts_1.default.global, 'save').mockImplementation(() => null);
let storageCounter = 0;
const keyring = new keyring_1.Keyring({ ss58Format: 18 });
const datastoreKeyring = keyring.createFromUri('Datastore');
const escrowSpendTrackerMock = new _MockEscrowSpendTracker_1.default();
beforeAll(async () => {
    if (Fs.existsSync(`${__dirname}/datastores/output-manifest.json`)) {
        Fs.unlinkSync(`${__dirname}/datastores/output-manifest.json`);
    }
    if (Fs.existsSync(`${__dirname}/datastores/output.dbx`)) {
        Fs.rmSync(`${__dirname}/datastores/output.dbx`, { recursive: true });
    }
    CreditReserver_1.default.defaultBasePath = Path.join(storageDir, `credits.json`);
    cloudNode = await datastore_testing_1.Helpers.createLocalNode({
        datastoreConfiguration: {
            datastoresDir: storageDir,
            datastoresTmpDir: Path.join(storageDir, 'tmp'),
        },
    }, true);
    cloudNode.datastoreCore.escrowSpendTracker = new EscrowSpendTracker_1.default(storageDir, null);
    client = new DatastoreApiClient_1.default(await cloudNode.address, { consoleLogErrors: true });
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
test('should be able run a Datastore with Credits', async () => {
    const packager = new datastore_packager_1.default(`${__dirname}/datastores/output.js`);
    Fs.writeFileSync(`${__dirname}/datastores/output-manifest.json`, JSON.stringify({
        payment: {
            address: datastoreKeyring.address,
            notaryId: 1,
        },
        extractorsByName: {
            putout: {
                prices: [{ basePrice: 1000 }],
            },
        },
        adminIdentities: [adminIdentity.bech32],
        version: '0.0.2',
    }));
    const dbx = await packager.build();
    const manifest = packager.manifest;
    await client.upload(await dbx.tarGzip(), { identity: adminIdentity });
    await expect(client.query(manifest.id, manifest.version, 'SELECT * FROM putout()', {})).rejects.toThrow('requires payment');
    const credits = await client.createCredits(manifest.id, manifest.version, 1001, adminIdentity);
    expect(credits).toEqual({
        id: expect.any(String),
        remainingCredits: 1001,
        secret: expect.any(String),
    });
    await CreditReserver_1.default.storeCredit(manifest.id, manifest.version, client.connectionToCore.transport.host, credits);
    const paymentService = new DefaultPaymentService_1.default();
    await paymentService.loadCredits();
    await expect(paymentService.credits()).resolves.toHaveLength(1);
    await expect(client.query(manifest.id, manifest.version, 'SELECT * FROM putout()', {
        paymentService,
    })).resolves.toEqual({
        outputs: [{ success: true }],
        metadata: {
            microgons: 1000,
            bytes: expect.any(Number),
            milliseconds: expect.any(Number),
        },
        queryId: expect.any(String),
        latestVersion: manifest.version,
    });
    await expect(client.getCreditsBalance(manifest.id, manifest.version, credits.id)).resolves.toEqual({
        balance: 1,
        issuedCredits: 1001,
    });
    await expect(client.query(manifest.id, manifest.version, 'SELECT * FROM putout()', {
        paymentService,
    })).rejects.toThrow(/Connect another payment source to continue/g);
});
test('should remove an empty Credits from the local cache', async () => {
    const manifest = { id: '1', version: '1.1.1' };
    const credits = { id: 'crd1', secret: 'hash', remainingCredits: 1250 };
    const paymentService = await CreditReserver_1.default.storeCredit(manifest.id, manifest.version, client.connectionToCore.transport.host, credits);
    await expect(paymentService.reserve({
        id: manifest.id,
        host: client.connectionToCore.transport.host,
        version: manifest.version,
        microgons: 1250,
        recipient: {
            address: datastoreKeyring.address,
            notaryId: 1,
        },
    })).resolves.toEqual(expect.objectContaining({ credits: { id: credits.id, secret: credits.secret } }));
    await expect(paymentService.reserve({
        id: manifest.id,
        host: client.connectionToCore.transport.host,
        version: manifest.version,
        microgons: 1,
        recipient: {
            address: datastoreKeyring.address,
            notaryId: 1,
        },
    })).rejects.toThrow('Insufficient credits balance');
});
test('should be able to embed Credits in a Datastore', async () => {
    const packager = new datastore_packager_1.default(`${__dirname}/datastores/output.js`);
    Fs.writeFileSync(`${__dirname}/datastores/output-manifest.json`, JSON.stringify({
        payment: {
            address: datastoreKeyring.address,
            notaryId: 1,
        },
        extractorsByName: {
            putout: {
                prices: [{ basePrice: 1000 }],
            },
        },
        adminIdentities: [adminIdentity.bech32],
        version: '0.0.4',
    }));
    const dbx = await packager.build();
    const manifest = packager.manifest;
    await client.upload(await dbx.tarGzip(), { identity: adminIdentity });
    const credits = await client.createCredits(manifest.id, manifest.version, 2001, adminIdentity);
    await CreditReserver_1.default.storeCredit(manifest.id, manifest.version, client.connectionToCore.transport.host, credits);
    const paymentService = new DefaultPaymentService_1.default();
    await paymentService.loadCredits();
    await expect(client.stream(manifest.id, manifest.version, 'putout', {}, {
        paymentService,
    })).resolves.toEqual([{ success: true }]);
    await expect(client.getCreditsBalance(manifest.id, manifest.version, credits.id)).resolves.toEqual({
        balance: 1001,
        issuedCredits: 2001,
    });
    await (0, cloneDatastore_1.default)(`ulx://${await cloudNode.address}/${manifest.id}@v${manifest.version}`, `${__dirname}/datastores/clone-output`, { embedCredits: credits });
    Fs.writeFileSync(`${__dirname}/datastores/clone-output/datastore-manifest.json`, JSON.stringify({
        payment: {
            address: datastoreKeyring.address,
            notaryId: 1,
        },
        extractorsByName: {
            putout: {
                prices: [{ basePrice: 1000 }],
            },
        },
        adminIdentities: [adminIdentity.bech32],
    }));
    {
        const packager2 = new datastore_packager_1.default(`${__dirname}/datastores/clone-output/datastore.ts`);
        const dbx2 = await packager2.build({ createTemporaryVersion: true });
        const manifest2 = packager2.manifest;
        await client.upload(await dbx2.tarGzip(), { identity: adminIdentity });
        const credits2 = await client.createCredits(manifest2.id, manifest2.version, 1002, adminIdentity);
        const credit2Service = await CreditReserver_1.default.storeCredit(manifest2.id, manifest2.version, client.connectionToCore.transport.host, credits2);
        paymentService.addCredit(credit2Service);
        await expect(client.stream(manifest2.id, manifest2.version, 'putout', {}, {
            paymentService,
        })).resolves.toEqual([{ success: true }]);
        await expect(client.getCreditsBalance(manifest.id, manifest.version, credits.id)).resolves.toEqual({
            balance: 1,
            issuedCredits: 2001,
        });
        await expect(client.getCreditsBalance(manifest2.id, manifest2.version, credits2.id)).resolves.toEqual({
            balance: 2,
            issuedCredits: 1002,
        });
    }
    // @ts-expect-error
    expect(cloudNode.datastoreCore.vm.apiClientCache.apiClientCacheByUrl).toEqual({
        [`ulx://${await cloudNode.address}`]: expect.any(DatastoreApiClient_1.default),
    });
}, 60e3);
//# sourceMappingURL=Credits.test.js.map