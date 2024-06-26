import { decodeAddress } from '@polkadot/util-crypto';
import Client from '@ulixee/client';
import { Helpers } from '@ulixee/datastore-testing';
import LocalchainPaymentService from '@ulixee/datastore/payments/LocalchainPaymentService';
import LocalPaymentService from '@ulixee/datastore/payments/LocalPaymentService';
import { DataDomainStore, Localchain } from '@ulixee/localchain';
import {
  checkForExtrinsicSuccess,
  getClient,
  Keyring,
  KeyringPair,
  UlxClient,
  UlxPrimitivesDataDomainVersionHost,
} from '@ulixee/mainchain';
import { IDatastoreMetadataResult } from '@ulixee/platform-specification/datastore/DatastoreApis';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import { gettersToObject } from '@ulixee/platform-utils/lib/objectUtils';
import { writeFile } from 'node:fs/promises';
import * as Path from 'node:path';
import { inspect } from 'util';
import TestCloudNode from '../lib/TestCloudNode';
import { describeIntegration } from '../lib/testHelpers';
import TestMainchain from '../lib/TestMainchain';
import TestNotary from '../lib/TestNotary';
import { execAndLog, getPlatformBuild } from '../lib/utils';

afterEach(Helpers.afterEach);
afterAll(Helpers.afterAll);
const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'e2e.payments.test');

let mainchainUrl: string;
const identityPath = Path.join(storageDir, 'DatastoreDev.pem');

let ferdie: KeyringPair;
inspect.defaultOptions.depth = 10;

describeIntegration('Payments E2E', () => {
  beforeAll(async () => {
    const mainchain = new TestMainchain();
    mainchainUrl = await mainchain.launch();
    const notary = new TestNotary();
    await notary.start(mainchainUrl);

    ferdie = new Keyring({ type: 'sr25519' }).createFromUri('//Ferdie');
    const sudo = new Keyring({ type: 'sr25519' }).createFromUri('//Alice');
    const mainchainClient = await getClient(mainchainUrl);

    await activateNotary(sudo, mainchainClient, notary);
    await mainchainClient.disconnect();

    execAndLog(`npx @ulixee/datastore admin-identity create --filename="${identityPath}"`);

    execAndLog(
      `npx @ulixee/localchain accounts create bobchain --suri="//Bob" --scheme=sr25519 --base-dir="${storageDir}"`,
    );
  });

  test('it can do end to end payments flow for a domain datastore', async () => {
    const buildDir = getPlatformBuild();

    const mainchainClient = await getClient(mainchainUrl);
    Helpers.onClose(() => mainchainClient.disconnect());

    const bobchain = await LocalchainPaymentService.load({
      localchainPath: Path.join(storageDir, 'bobchain.db'),
      mainchainUrl,
      escrowMilligonsStrategy: {
        type: 'multiplier',
        queries: 2,
      },
    });
    Helpers.onClose(() => bobchain.close());

    execAndLog(
      `npx @ulixee/localchain accounts create ferdiechain --suri="//Ferdie" --scheme=sr25519 --base-dir="${storageDir}"`,
    );
    const ferdiechain = await Localchain.load({
      mainchainUrl,
      path: Path.join(storageDir, 'ferdiechain.db'),
    });
    Helpers.onClose(() => ferdiechain.close());

    const ferdieVotesAddress = ferdie.derive('//votes').address;

    const domain = 'e2e.communication';
    // Hangs with the proxy url. Not sure why
    if (!process.env.ULX_USE_DOCKER_BINS) {
      const isDomainRegistered = execAndLog(
        `npx @ulixee/localchain data-domains check ${domain} -m "${mainchainUrl}"`,
      );
      expect(isDomainRegistered).toContain(' No ');
      console.log('Domain registered?', isDomainRegistered);
    }
    const dataDomainHash = DataDomainStore.getHash(domain);
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
      await new Promise(resolve =>
        setTimeout(resolve, Number(ferdiechain.ticker.millisToNextTick())),
      );
    }

    {
      const ferdieChange = ferdiechain.beginChange();
      await ferdieChange.leaseDataDomain(domain, await ferdiechain.address);
      await ferdieChange.notarizeAndWaitForNotebook();
    }

    const identityBech32 = execAndLog(
      `npx @ulixee/datastore admin-identity read --filename="${identityPath}"`,
    )
      .split(/\r?\n/)
      .shift()
      .trim();
    expect(identityBech32).toContain('id1');
    const cloudNode = new TestCloudNode(buildDir);
    const cloudAddress = await cloudNode.start({
      ULX_CLOUD_ADMIN_IDENTITIES: identityBech32,
      ULX_IDENTITY_PATH: identityPath,
      ULX_MAINCHAIN_URL: mainchainUrl,
      ULX_LOCALCHAIN_PATH: ferdiechain.path,
      ULX_VOTES_ADDRESS: ferdieVotesAddress,
      ULX_NOTARY_ID: '1',
    });
    expect(cloudAddress).toBeTruthy();
    Helpers.onClose(() => cloudNode.close());

    const datastoreId = 'end-to-end';
    const datastoreVersion = '0.0.1';
    await uploadDatastore(datastoreId, buildDir, cloudAddress, {
      domain,
      payment: {
        notaryId: 1,
        address: ferdie.address,
      },
    });

    await registerZoneRecord(
      mainchainClient,
      dataDomainHash,
      ferdie,
      decodeAddress(ferdie.address, false, 42),
      1,
      {
        [datastoreVersion]: mainchainClient.createType('UlxPrimitivesDataDomainVersionHost', {
          datastoreId: mainchainClient.createType('Bytes', datastoreId),
          host: mainchainClient.createType('Bytes', `ws://127.0.0.1:${cloudAddress.split(':')[1]}`),
        }),
      },
    );

    const paymentService = new LocalPaymentService(bobchain, storageDir);
    const payments: LocalPaymentService['EventTypes']['reserved'][] = [];
    const escrows: LocalPaymentService['EventTypes']['createdEscrow'][] = [];
    paymentService.on('reserved', payment => payments.push(payment));
    paymentService.on('createdEscrow', e => escrows.push(e));
    Helpers.onClose(() => paymentService.close());
    let metadata: IDatastoreMetadataResult;
    const client = new Client(`ulx://${domain}/@v${datastoreVersion}`, {
      paymentService,
      mainchainUrl,
      onQueryResult(result) {
        metadata = result.metadata;
      },
    });
    Helpers.needsClosing.push({ close: () => client.disconnect(), onlyCloseOnFinal: false });

    const result = await client.query('SELECT * FROM default(test => $1)', [1]);

    expect(result).toEqual([{ success: true, input: { test: 1 } }]);
    expect(metadata).toEqual(
      expect.objectContaining({
        microgons: 500_000,
        milliseconds: expect.any(Number),
        bytes: expect.any(Number),
      }),
    );

    expect(escrows).toHaveLength(1);
    expect(escrows[0].allocatedMilligons).toBe(1000n);
    expect(escrows[0].datastoreId).toBe(datastoreId);
    expect(payments).toHaveLength(1);
    expect(payments[0].payment.microgons).toBe(500_000);
    expect(payments[0].payment.escrow).toBeTruthy();
    expect(payments[0].payment.escrow.settledMilligons).toBe(500n);
    expect(payments[0].remainingBalance).toBe(500_000);

    const balance = await bobchain.getWallet();
    console.log('Balance:', await gettersToObject(balance.accounts));
    expect(balance.accounts[0].balance).toBe(4800n);
    expect(balance.accounts[0].heldBalance).toBe(1000n);
  }, 300e3);

  test('it can do end to end payments with no domain', async () => {
    const buildDir = getPlatformBuild();

    const identityBech32 = execAndLog(
      `npx @ulixee/datastore admin-identity read --filename="${identityPath}"`,
    )
      .split(/\r?\n/)
      .shift()
      .trim();
    expect(identityBech32).toContain('id1');

    const cloudNode = new TestCloudNode(buildDir);
    Helpers.onClose(() => cloudNode.close());
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

    const bobchain = await LocalchainPaymentService.load({
      localchainPath: Path.join(storageDir, 'bobchain.db'),
      mainchainUrl,
      escrowMilligonsStrategy: {
        type: 'multiplier',
        queries: 2,
      },
    });
    Helpers.onClose(() => bobchain.close());
    const wallet = await bobchain.getWallet();
    // ensure wallet is loaded
    expect(wallet.accounts[0].balance).toBe(4800n);

    const paymentService = new LocalPaymentService(bobchain, storageDir);
    const payments: LocalPaymentService['EventTypes']['reserved'][] = [];
    const escrows: LocalPaymentService['EventTypes']['createdEscrow'][] = [];
    paymentService.on('reserved', payment => payments.push(payment));
    paymentService.on('createdEscrow', e => escrows.push(e));
    let metadata: IDatastoreMetadataResult;
    const client = new Client(`ulx://${cloudAddress}/no-domain@v0.0.2`, {
      paymentService,
      mainchainUrl,
      onQueryResult(result) {
        metadata = result.metadata;
      },
    });
    Helpers.onClose(() => client.disconnect());

    const result = await client.query('SELECT * FROM nod()');

    expect(result).toEqual([{ noDomain: true }]);
    expect(metadata).toEqual(
      expect.objectContaining({
        microgons: 1_000,
        milliseconds: expect.any(Number),
        bytes: expect.any(Number),
      }),
    );
    expect(escrows).toHaveLength(1);
    expect(escrows[0].allocatedMilligons).toBe(5n);
    expect(escrows[0].datastoreId).toBe('no-domain');
    expect(payments).toHaveLength(1);
    expect(payments[0].payment.microgons).toBe(1000);
    expect(payments[0].payment.escrow).toBeTruthy();
    expect(payments[0].payment.escrow.settledMilligons).toBe(5n);
    expect(payments[0].remainingBalance).toBe(5_000 - 1_000);

    const balance = await bobchain.getWallet();
    console.log('Balance:', await gettersToObject(balance.accounts));
    expect(balance.accounts[0].balance).toBe(4798n);
    expect(balance.accounts[0].heldBalance).toBe(1005n);
  });
});

async function uploadDatastore(
  id: string,
  buildDir: string,
  cloudAddress: string,
  manifest: Partial<IDatastoreManifest>,
) {
  const datastorePath = Path.join('end-to-end', 'test', 'datastore', `${id}.js`);
  await writeFile(
    Path.join(buildDir, datastorePath.replace('.js', '-manifest.json')),
    JSON.stringify(manifest),
  );
  execAndLog(
    `npx @ulixee/datastore deploy --skip-docs -h ${cloudAddress} .${Path.sep}${datastorePath}`,
    {
      cwd: buildDir,
      env: {
        ...process.env,
        ULX_IDENTITY_PATH: identityPath,
      },
    },
  );
}

async function registerZoneRecord(
  client: UlxClient,
  dataDomainHash: Uint8Array,
  owner: KeyringPair,
  paymentAccount: Uint8Array,
  notaryId: number,
  versions: Record<string, UlxPrimitivesDataDomainVersionHost>,
) {
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
          checkForExtrinsicSuccess(events, client).then(resolve).catch(reject);
        }
        if (status.isInBlock) {
          checkForExtrinsicSuccess(events, client).catch(reject);
        }
      })
      .catch(reject);
  });
}

async function activateNotary(
  sudo: KeyringPair,
  client: UlxClient,
  notary: TestNotary,
): Promise<void> {
  await notary.register(client);
  await new Promise<void>((resolve, reject) => {
    void client.tx.sudo
      .sudo(client.tx.notaries.activate(notary.operator.publicKey))
      .signAndSend(sudo, ({ events, status }) => {
        if (status.isInBlock) {
          // eslint-disable-next-line promise/always-return
          return checkForExtrinsicSuccess(events, client).then(() => {
            console.log(`Successful activation of notary in block ${status.asInBlock.toHex()}`);
            resolve();
          }, reject);
        }
        console.log(`Status of notary activation: ${status.type}`);
      });
  });
}
