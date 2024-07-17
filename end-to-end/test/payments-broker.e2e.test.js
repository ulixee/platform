"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_crypto_1 = require("@polkadot/util-crypto");
const client_1 = require("@ulixee/client");
const datastore_testing_1 = require("@ulixee/datastore-testing");
const DefaultPaymentService_1 = require("@ulixee/datastore/payments/DefaultPaymentService");
const localchain_1 = require("@ulixee/localchain");
const mainchain_1 = require("@ulixee/mainchain");
const Identity_1 = require("@ulixee/platform-utils/lib/Identity");
const Path = require("node:path");
const util_1 = require("util");
const localchainHelpers_1 = require("../lib/localchainHelpers");
const TestCloudNode_1 = require("../lib/TestCloudNode");
const TestDatabroker_1 = require("../lib/TestDatabroker");
const testHelpers_1 = require("../lib/testHelpers");
const TestMainchain_1 = require("../lib/TestMainchain");
const TestNotary_1 = require("../lib/TestNotary");
const utils_1 = require("../lib/utils");
afterEach(datastore_testing_1.Helpers.afterEach);
afterAll(datastore_testing_1.Helpers.afterAll);
const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'e2e.payments-broker.test');
let mainchainUrl;
let brokerAddress;
let broker;
const clientUserPath = Path.join(storageDir, 'DatastoreClient.pem');
const identityPath = Path.join(storageDir, 'DatastoreDev.pem');
let ferdie;
util_1.inspect.defaultOptions.depth = 10;
(0, testHelpers_1.describeIntegration)('Payments with Broker E2E', () => {
    beforeAll(async () => {
        const mainchain = new TestMainchain_1.default();
        mainchainUrl = await mainchain.launch();
        const notary = new TestNotary_1.default();
        await notary.start(mainchainUrl);
        ferdie = new mainchain_1.Keyring({ type: 'sr25519' }).createFromUri('//Ferdie');
        const sudo = new mainchain_1.Keyring({ type: 'sr25519' }).createFromUri('//Alice');
        const mainchainClient = await (0, mainchain_1.getClient)(mainchainUrl);
        await (0, TestMainchain_1.activateNotary)(sudo, mainchainClient, notary);
        await mainchainClient.disconnect();
        (0, utils_1.execAndLog)(`npx @ulixee/datastore admin-identity create --filename="${identityPath}"`);
        (0, utils_1.execAndLog)(`npx @ulixee/localchain accounts create brokerchain --suri="//Bob" --scheme=sr25519 --base-dir="${storageDir}"`);
        broker = new TestDatabroker_1.default();
        brokerAddress = await broker.start({
            ULX_DATABROKER_DIR: storageDir,
            ULX_MAINCHAIN_URL: mainchainUrl,
            ULX_LOCALCHAIN_PATH: Path.join(storageDir, 'brokerchain.db'),
        });
        console.log('booted up', brokerAddress, broker.adminAddress);
    }, 60e3);
    test('it can use a databroker for a domain datastore', async () => {
        const brokerchain = await localchain_1.Localchain.load({
            path: Path.join(storageDir, 'brokerchain.db'),
            mainchainUrl,
        });
        datastore_testing_1.Helpers.onClose(() => brokerchain.close());
        (0, utils_1.execAndLog)(`npx @ulixee/localchain accounts create ferdiechain --suri="//Ferdie" --scheme=sr25519 --base-dir="${storageDir}"`);
        const ferdiechain = await localchain_1.Localchain.load({
            mainchainUrl,
            path: Path.join(storageDir, 'ferdiechain.db'),
        });
        datastore_testing_1.Helpers.onClose(() => ferdiechain.close());
        const ferdieVotesAddress = ferdie.derive('//votes').address;
        await Promise.all([
            ferdiechain.mainchainTransfers.sendToLocalchain(1000n, 1),
            brokerchain.mainchainTransfers.sendToLocalchain(5000n, 1),
        ]);
        await Promise.all([
            (0, localchainHelpers_1.waitForSynchedBalance)(ferdiechain, 1000n),
            (0, localchainHelpers_1.waitForSynchedBalance)(brokerchain, 5000n),
        ]);
        const domain = 'broker.communication';
        const datastoreId = 'broker';
        const datastoreVersion = '0.0.1';
        await setupDatastore(ferdiechain, ferdie, domain, datastoreId, datastoreVersion, ferdieVotesAddress);
        (0, utils_1.execAndLog)(`npx @ulixee/datastore admin-identity create --filename="${clientUserPath}"`);
        await broker.registerUser(clientUserPath, 1000n);
        await broker.whitelistDomain(domain);
        const paymentService = await DefaultPaymentService_1.default.fromBroker(brokerAddress, {
            pemPath: clientUserPath,
        }, {
            type: 'default',
            milligons: 500n,
        });
        const payments = [];
        const escrows = [];
        paymentService.on('reserved', payment => payments.push(payment));
        paymentService.on('createdEscrow', e => escrows.push(e));
        datastore_testing_1.Helpers.onClose(() => paymentService.close());
        let metadata;
        const client = new client_1.default(`ulx://${domain}/@v${datastoreVersion}`, {
            paymentService,
            mainchainUrl,
            onQueryResult(result) {
                metadata = result.metadata;
            },
        });
        datastore_testing_1.Helpers.needsClosing.push({ close: () => client.disconnect(), onlyCloseOnFinal: false });
        const result = await client.query('SELECT * FROM default(test => $1)', [1]);
        expect(result).toEqual([{ success: true, input: { test: 1 } }]);
        expect(metadata).toEqual(expect.objectContaining({
            microgons: 50000,
            milliseconds: expect.any(Number),
            bytes: expect.any(Number),
        }));
        expect(escrows).toHaveLength(1);
        expect(escrows[0].allocatedMilligons).toBe(500n);
        expect(escrows[0].datastoreId).toBe(datastoreId);
        expect(payments).toHaveLength(1);
        expect(payments[0].payment.microgons).toBe(50000);
        expect(payments[0].payment.escrow).toBeTruthy();
        expect(payments[0].payment.escrow.settledMilligons).toBe(50n);
        expect(payments[0].remainingBalance).toBe(450e3);
        const clientIdentity = Identity_1.default.loadFromFile(clientUserPath);
        await expect(broker.getBalance(clientIdentity.bech32)).resolves.toBe(500n);
    }, 300e3);
});
async function setupDatastore(localchain, domainOwner, domain, datastoreId, version, votesAddress) {
    const buildDir = (0, utils_1.getPlatformBuild)();
    const mainchainClient = await (0, mainchain_1.getClient)(mainchainUrl);
    datastore_testing_1.Helpers.onClose(() => mainchainClient.disconnect());
    {
        const registration = localchain.beginChange();
        await registration.leaseDataDomain(domain, await localchain.address);
        await registration.notarizeAndWaitForNotebook();
    }
    const identityBech32 = (0, utils_1.execAndLog)(`npx @ulixee/datastore admin-identity read --filename="${identityPath}"`)
        .split(/\r?\n/)
        .shift()
        .trim();
    expect(identityBech32).toContain('id1');
    const cloudNode = new TestCloudNode_1.default(buildDir);
    const cloudAddress = await cloudNode.start({
        ULX_CLOUD_ADMIN_IDENTITIES: identityBech32,
        ULX_IDENTITY_PATH: identityPath,
        ULX_MAINCHAIN_URL: mainchainUrl,
        ULX_LOCALCHAIN_PATH: localchain.path,
        ULX_VOTES_ADDRESS: votesAddress,
        ULX_NOTARY_ID: '1',
    });
    expect(cloudAddress).toBeTruthy();
    datastore_testing_1.Helpers.onClose(() => cloudNode.close());
    await (0, TestCloudNode_1.uploadDatastore)(datastoreId, buildDir, cloudAddress, {
        domain,
        payment: {
            notaryId: 1,
            address: domainOwner.address,
        },
    }, identityPath);
    const dataDomainHash = localchain_1.DataDomainStore.getHash(domain);
    await (0, TestMainchain_1.registerZoneRecord)(mainchainClient, dataDomainHash, domainOwner, (0, util_crypto_1.decodeAddress)(domainOwner.address, false, 42), 1, {
        [version]: mainchainClient.createType('UlxPrimitivesDataDomainVersionHost', {
            datastoreId: mainchainClient.createType('Bytes', datastoreId),
            host: mainchainClient.createType('Bytes', `ws://127.0.0.1:${cloudAddress.split(':')[1]}`),
        }),
    });
}
//# sourceMappingURL=payments-broker.e2e.test.js.map