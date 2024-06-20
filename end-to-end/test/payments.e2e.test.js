"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_crypto_1 = require("@polkadot/util-crypto");
const client_1 = require("@ulixee/client");
const datastore_testing_1 = require("@ulixee/datastore-testing");
const LocalchainPaymentService_1 = require("@ulixee/datastore/payments/LocalchainPaymentService");
const LocalPaymentService_1 = require("@ulixee/datastore/payments/LocalPaymentService");
const localchain_1 = require("@ulixee/localchain");
const mainchain_1 = require("@ulixee/mainchain");
const objectUtils_1 = require("@ulixee/platform-utils/lib/objectUtils");
const promises_1 = require("node:fs/promises");
const Path = require("node:path");
const util_1 = require("util");
const TestCloudNode_1 = require("../lib/TestCloudNode");
const testHelpers_1 = require("../lib/testHelpers");
const TestMainchain_1 = require("../lib/TestMainchain");
const TestNotary_1 = require("../lib/TestNotary");
const utils_1 = require("../lib/utils");
afterEach(datastore_testing_1.Helpers.afterEach);
afterAll(datastore_testing_1.Helpers.afterAll);
const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'e2e.payments.test');
let mainchainUrl;
const identityPath = Path.join(storageDir, 'DatastoreDev.pem');
let ferdie;
util_1.inspect.defaultOptions.depth = 10;
(0, testHelpers_1.describeIntegration)('Payments E2E', () => {
    beforeAll(async () => {
        const mainchain = new TestMainchain_1.default();
        mainchainUrl = await mainchain.launch();
        const notary = new TestNotary_1.default();
        await notary.start(mainchainUrl);
        ferdie = new mainchain_1.Keyring({ type: 'sr25519' }).createFromUri('//Ferdie');
        const sudo = new mainchain_1.Keyring({ type: 'sr25519' }).createFromUri('//Alice');
        const mainchainClient = await (0, mainchain_1.getClient)(mainchainUrl);
        await activateNotary(sudo, mainchainClient, notary);
        await mainchainClient.disconnect();
        (0, utils_1.execAndLog)(`npx @ulixee/datastore admin-identity create --filename="${identityPath}"`);
        (0, utils_1.execAndLog)(`npx @ulixee/localchain accounts create bobchain --suri="//Bob" --scheme=sr25519 --base-dir="${storageDir}"`);
    });
    test('it can do end to end payments flow for a domain datastore', async () => {
        const buildDir = (0, utils_1.getPlatformBuild)();
        const mainchainClient = await (0, mainchain_1.getClient)(mainchainUrl);
        datastore_testing_1.Helpers.onClose(() => mainchainClient.disconnect());
        const bobchain = await LocalchainPaymentService_1.default.load({
            localchainPath: Path.join(storageDir, 'bobchain.db'),
            mainchainUrl,
            escrowMilligonsStrategy: {
                type: 'multiplier',
                queries: 2,
            },
        });
        datastore_testing_1.Helpers.onClose(() => bobchain.close());
        (0, utils_1.execAndLog)(`npx @ulixee/localchain accounts create ferdiechain --suri="//Ferdie" --scheme=sr25519 --base-dir="${storageDir}"`);
        const ferdiechain = await localchain_1.Localchain.load({
            mainchainUrl,
            path: Path.join(storageDir, 'ferdiechain.db'),
        });
        datastore_testing_1.Helpers.onClose(() => ferdiechain.close());
        const ferdieVotesAddress = ferdie.derive('//votes').address;
        const domain = 'e2e.communication';
        // Hangs with the proxy url. Not sure why
        if (!process.env.ULX_USE_DOCKER_BINS) {
            const isDomainRegistered = (0, utils_1.execAndLog)(`npx @ulixee/localchain data-domains check ${domain} -m "${mainchainUrl}"`);
            expect(isDomainRegistered).toContain(' No ');
            console.log('Domain registered?', isDomainRegistered);
        }
        const dataDomainHash = localchain_1.DataDomainStore.getHash(domain);
        await Promise.all([
            ferdiechain.mainchainTransfers.sendToLocalchain(1000n, 1),
            bobchain.localchain.mainchainTransfers.sendToLocalchain(5000n, 1),
        ]);
        let isSynched = false;
        while (!isSynched) {
            await ferdiechain.balanceSync.sync({});
            await bobchain.localchain.balanceSync.sync({});
            const ferdieOverview = await ferdiechain.accountOverview();
            const bobOverview = await bobchain.localchain.accountOverview();
            isSynched = ferdieOverview.balance === 1000n && bobOverview.balance === 5000n;
            await new Promise(resolve => setTimeout(resolve, Number(ferdiechain.ticker.millisToNextTick())));
        }
        {
            const ferdieChange = ferdiechain.beginChange();
            await ferdieChange.leaseDataDomain(domain, await ferdiechain.address);
            await ferdieChange.notarizeAndWaitForNotebook();
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
            ULX_LOCALCHAIN_PATH: ferdiechain.path,
            ULX_VOTES_ADDRESS: ferdieVotesAddress,
            ULX_NOTARY_ID: '1',
        });
        expect(cloudAddress).toBeTruthy();
        datastore_testing_1.Helpers.onClose(() => cloudNode.close());
        const datastoreId = 'end-to-end';
        const datastoreVersion = '0.0.1';
        await uploadDatastore(datastoreId, buildDir, cloudAddress, {
            domain,
            payment: {
                notaryId: 1,
                address: ferdie.address,
            },
        });
        await registerZoneRecord(mainchainClient, dataDomainHash, ferdie, (0, util_crypto_1.decodeAddress)(ferdie.address, false, 42), 1, {
            [datastoreVersion]: mainchainClient.createType('UlxPrimitivesDataDomainVersionHost', {
                datastoreId: mainchainClient.createType('Bytes', datastoreId),
                host: mainchainClient.createType('Bytes', `ws://127.0.0.1:${cloudAddress.split(':')[1]}`),
            }),
        });
        const paymentService = new LocalPaymentService_1.default(bobchain, storageDir);
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
            microgons: 500000,
            milliseconds: expect.any(Number),
            bytes: expect.any(Number),
        }));
        expect(escrows).toHaveLength(1);
        expect(escrows[0].allocatedMilligons).toBe(1000n);
        expect(escrows[0].datastoreId).toBe(datastoreId);
        expect(payments).toHaveLength(1);
        expect(payments[0].payment.microgons).toBe(500000);
        expect(payments[0].payment.escrow).toBeTruthy();
        expect(payments[0].payment.escrow.settledMilligons).toBe(500n);
        expect(payments[0].remainingBalance).toBe(500000);
        const balance = await bobchain.getWallet();
        console.log('Balance:', await (0, objectUtils_1.gettersToObject)(balance.accounts));
        expect(balance.accounts[0].balance).toBe(4800n);
        expect(balance.accounts[0].heldBalance).toBe(1000n);
    }, 300e3);
    test('it can do end to end payments with no domain', async () => {
        const buildDir = (0, utils_1.getPlatformBuild)();
        const identityBech32 = (0, utils_1.execAndLog)(`npx @ulixee/datastore admin-identity read --filename="${identityPath}"`)
            .split(/\r?\n/)
            .shift()
            .trim();
        expect(identityBech32).toContain('id1');
        const cloudNode = new TestCloudNode_1.default(buildDir);
        datastore_testing_1.Helpers.onClose(() => cloudNode.close());
        const cloudAddress = await cloudNode.start({
            ULX_CLOUD_ADMIN_IDENTITIES: identityBech32.trim(),
            ULX_IDENTITY_PATH: identityPath,
            ULX_MAINCHAIN_URL: mainchainUrl,
            ULX_LOCALCHAIN_PATH: Path.join(storageDir, 'ferdiechain.db'),
            ULX_NOTARY_ID: '1',
        });
        expect(cloudAddress).toBeTruthy();
        await uploadDatastore('no-domain', buildDir, cloudAddress, {
            version: '0.0.2',
            payment: {
                notaryId: 1,
                address: ferdie.address,
            },
        });
        const bobchain = await LocalchainPaymentService_1.default.load({
            localchainPath: Path.join(storageDir, 'bobchain.db'),
            mainchainUrl,
            escrowMilligonsStrategy: {
                type: 'multiplier',
                queries: 2,
            },
        });
        datastore_testing_1.Helpers.onClose(() => bobchain.close());
        const wallet = await bobchain.getWallet();
        // ensure wallet is loaded
        expect(wallet.accounts[0].balance).toBe(4800n);
        const paymentService = new LocalPaymentService_1.default(bobchain, storageDir);
        const payments = [];
        const escrows = [];
        paymentService.on('reserved', payment => payments.push(payment));
        paymentService.on('createdEscrow', e => escrows.push(e));
        let metadata;
        const client = new client_1.default(`ulx://${cloudAddress}/no-domain@v0.0.2`, {
            paymentService,
            mainchainUrl,
            onQueryResult(result) {
                metadata = result.metadata;
            },
        });
        datastore_testing_1.Helpers.onClose(() => client.disconnect());
        const result = await client.query('SELECT * FROM nod()');
        expect(result).toEqual([{ noDomain: true }]);
        expect(metadata).toEqual(expect.objectContaining({
            microgons: 1000,
            milliseconds: expect.any(Number),
            bytes: expect.any(Number),
        }));
        expect(escrows).toHaveLength(1);
        expect(escrows[0].allocatedMilligons).toBe(5n);
        expect(escrows[0].datastoreId).toBe('no-domain');
        expect(payments).toHaveLength(1);
        expect(payments[0].payment.microgons).toBe(1000);
        expect(payments[0].payment.escrow).toBeTruthy();
        expect(payments[0].payment.escrow.settledMilligons).toBe(5n);
        expect(payments[0].remainingBalance).toBe(5000 - 1000);
        const balance = await bobchain.getWallet();
        console.log('Balance:', await (0, objectUtils_1.gettersToObject)(balance.accounts));
        expect(balance.accounts[0].balance).toBe(4798n);
        expect(balance.accounts[0].heldBalance).toBe(1005n);
    });
});
async function uploadDatastore(id, buildDir, cloudAddress, manifest) {
    const datastorePath = Path.join('end-to-end', 'test', 'datastore', `${id}.js`);
    await (0, promises_1.writeFile)(Path.join(buildDir, datastorePath.replace('.js', '-manifest.json')), JSON.stringify(manifest));
    (0, utils_1.execAndLog)(`npx @ulixee/datastore deploy --skip-docs -h ${cloudAddress} .${Path.sep}${datastorePath}`, {
        cwd: buildDir,
        env: {
            ...process.env,
            ULX_IDENTITY_PATH: identityPath,
        },
    });
}
async function registerZoneRecord(client, dataDomainHash, owner, paymentAccount, notaryId, versions) {
    const codecVersions = new Map();
    for (const [version, host] of Object.entries(versions)) {
        const [major, minor, patch] = version.split('.');
        const versionCodec = client.createType('UlxPrimitivesDataDomainSemver', {
            major,
            minor,
            patch,
        });
        codecVersions.set(versionCodec, client.createType('UlxPrimitivesDataDomainVersionHost', host));
    }
    await new Promise((resolve, reject) => {
        return client.tx.dataDomain
            .setZoneRecord(dataDomainHash, {
            paymentAccount,
            notaryId,
            versions: codecVersions,
        })
            .signAndSend(owner, ({ events, status }) => {
            if (status.isFinalized) {
                (0, mainchain_1.checkForExtrinsicSuccess)(events, client).then(resolve).catch(reject);
            }
            if (status.isInBlock) {
                (0, mainchain_1.checkForExtrinsicSuccess)(events, client).catch(reject);
            }
        })
            .catch(reject);
    });
}
async function activateNotary(sudo, client, notary) {
    await notary.register(client);
    await new Promise((resolve, reject) => {
        void client.tx.sudo
            .sudo(client.tx.notaries.activate(notary.operator.publicKey))
            .signAndSend(sudo, ({ events, status }) => {
            if (status.isInBlock) {
                // eslint-disable-next-line promise/always-return
                return (0, mainchain_1.checkForExtrinsicSuccess)(events, client).then(() => {
                    console.log(`Successful activation of notary in block ${status.asInBlock.toHex()}`);
                    resolve();
                }, reject);
            }
            console.log(`Status of notary activation: ${status.type}`);
        });
    });
}
//# sourceMappingURL=payments.e2e.test.js.map