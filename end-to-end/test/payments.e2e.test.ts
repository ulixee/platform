import { decodeAddress } from '@polkadot/util-crypto';
import Client from '@ulixee/client';
import { Helpers } from '@ulixee/datastore-testing';
import LocalchainPaymentService from '@ulixee/datastore/payments/LocalchainPaymentService';
import LocalPaymentService from '@ulixee/datastore/payments/LocalPaymentService';
import {
  AccountType,
  BalanceChangeBuilder,
  CryptoScheme,
  DataDomainStore,
  Localchain,
  NotarizationBuilder,
  Signer,
} from '@ulixee/localchain';
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
import { mkdir, writeFile } from 'node:fs/promises';
import * as Path from 'node:path';
import TestCloudNode from '../lib/TestCloudNode';
import TestMainchain from '../lib/TestMainchain';
import TestNotary, { ipToInt32 } from '../lib/TestNotary';
import { execAndLog, getPlatformBuild } from '../lib/utils';

afterEach(Helpers.afterEach);
afterAll(Helpers.afterAll);
const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'e2e.payments.test');

let mainchainUrl: string;
const identityPath = Path.join(storageDir, 'DatastoreDev.pem');
const bobchainBasePath = Path.join(storageDir, 'bobchain');
const ferdieBasePath = Path.join(storageDir, 'ferdiechain');
const ferdieKeystore = new Signer();
let bobEscrowFunding: KeyringPair;
let bobTaxAddress: KeyringPair;
let bob: KeyringPair;

beforeAll(async () => {
  await mkdir(ferdieBasePath, { recursive: true });
  await mkdir(bobchainBasePath, { recursive: true });

  const mainchain = new TestMainchain();
  mainchainUrl = await mainchain.launch();
  const notary = new TestNotary();
  await notary.start(mainchainUrl);

  const sudo = new Keyring({ type: 'sr25519' }).createFromUri('//Alice');
  const mainchainClient = await getClient(mainchainUrl);

  await activateNotary(sudo, mainchainClient, notary);
  await mainchainClient.disconnect();
  await ferdieKeystore.attachKeystore(ferdieBasePath, {});

  execAndLog(`npx @ulixee/datastore admin-identity create --filename="${identityPath}"`);

  execAndLog(
    `npx @ulixee/localchain keystore insert --suri="//Bob//escrows//1" --keystore-path="${bobchainBasePath}"`,
  );
  execAndLog(
    `npx @ulixee/localchain keystore insert --suri="//Bob//tax//1" --keystore-path="${bobchainBasePath}"`,
  );
  bobEscrowFunding = new Keyring({ type: 'sr25519' }).createFromUri('//Bob//escrows//1');
  bobTaxAddress = new Keyring({ type: 'sr25519' }).createFromUri('//Bob//tax//1');
  bob = new Keyring({ type: 'sr25519' }).createFromUri('//Bob');
});

test('it can do end to end payments flow for a domain datastore', async () => {
  const buildDir = getPlatformBuild();

  const mainchainClient = await getClient(mainchainUrl);
  Helpers.needsClosing.push({ close: () => mainchainClient.disconnect(), onlyCloseOnFinal: false });

  const bobchain = await LocalchainPaymentService.load({
    localchainPath: bobchainBasePath,
    mainchainUrl,
    datastoreFundingAddress: bobEscrowFunding.address,
    taxAddress: bobTaxAddress.address,
    escrowMilligonsStrategy: {
      type: 'multiplier',
      queries: 2,
    },
  });

  const ferdie = new Keyring({ type: 'sr25519' }).createFromUri('//Ferdie');
  const ferdiechain = await Localchain.load({
    mainchainUrl,
    dbPath: Path.join(ferdieBasePath, 'localchain.db'),
  });

  const ferdieVotesAddress = ferdieKeystore.createAccountId(CryptoScheme.Sr25519);
  const ferdieDomainProfitsAddress = ferdieKeystore.createAccountId(CryptoScheme.Sr25519);
  const ferdieDomainAddress = ferdieKeystore.createAccountId(CryptoScheme.Sr25519);

  const domain = 'e2e.communication';
  const isDomainRegistered = execAndLog(
    `npx @ulixee/localchain data-domains check ${domain} -m "${mainchainUrl}"`,
  );
  expect(isDomainRegistered).toContain(' No ');
  const dataDomainHash = DataDomainStore.getHash(domain);
  {
    const [ferdieChange, bobChange] = await Promise.all([
      transferMainchainToLocalchain(mainchainClient, ferdiechain, ferdie, 1000, 1),
      transferMainchainToLocalchain(mainchainClient, bobchain.localchain, bob, 5000, 1),
    ]);
    await ferdieChange.notarization.leaseDataDomain(
      ferdie.address,
      ferdie.address,
      domain,
      ferdie.address,
    );
    // need to send enough to create an escrow after tax
    await bobChange.notarization.moveToSubAddress(
      bob.address,
      bobEscrowFunding.address,
      AccountType.Deposit,
      5000n,
      bobTaxAddress.address,
    );

    // for these, we'll act like this happened outside of a client (eg, using desktop)
    const [, ferdieTracker] = await Promise.all([
      bobChange.notarization.notarizeAndWaitForNotebook(
        new Signer(async (address, signatureMessage) => {
          if (bob.address === address) return bob.sign(signatureMessage, { withType: true });
          if (bobTaxAddress.address === address)
            return bobTaxAddress.sign(signatureMessage, { withType: true });
          if (bobEscrowFunding.address === address)
            return bobEscrowFunding.sign(signatureMessage, { withType: true });
          throw new Error('Invalid address');
        }),
      ),
      ferdieChange.notarization.notarizeAndWaitForNotebook(
        new Signer(async (address, signatureMessage) => {
          if (ferdie.address === address) return ferdie.sign(signatureMessage, { withType: true });
          throw new Error('Invalid address');
        }),
      ),
    ]);

    const ferdieMainchainClient = await ferdiechain.mainchainClient;
    await ferdieTracker.waitForFinalized(ferdieMainchainClient);
  }

  const identityBech32 = execAndLog(
    `npx @ulixee/datastore admin-identity read --filename="${identityPath}"`,
  );
  expect(identityBech32).toContain('id1');
  const cloudNode = new TestCloudNode(buildDir);
  const cloudAddress = await cloudNode.start({
    ULX_CLOUD_ADMIN_IDENTITIES: identityBech32.trim(),
    ULX_IDENTITY_PATH: identityPath,
    ULX_MAINCHAIN_URL: mainchainUrl,
    ULX_LOCALCHAIN_BASE_PATH: ferdieBasePath,
    ULX_TAX_ADDRESS: ferdieDomainProfitsAddress,
    ULX_VOTES_ADDRESS: ferdieVotesAddress,
    ULX_NOTARY_ID: '1',
  });
  expect(cloudAddress).toBeTruthy();
  Helpers.needsClosing.push({ close: () => cloudNode.close(), onlyCloseOnFinal: false });

  const datastoreId = 'end-to-end';
  const datastoreVersion = '0.0.1';
  await uploadDatastore(datastoreId, buildDir, cloudAddress, {
    domain,
    payment: {
      notaryId: 1,
      address: ferdieDomainProfitsAddress,
    },
  });

  await registerZoneRecord(
    mainchainClient,
    dataDomainHash,
    ferdie,
    decodeAddress(ferdieDomainAddress, false, 42),
    1,
    {
      [datastoreVersion]: mainchainClient.createType('UlxPrimitivesDataDomainVersionHost', {
        datastoreId: mainchainClient.createType('Bytes', datastoreId),
        host: {
          ip: ipToInt32('127.0.0.1'),
          port: cloudAddress.split(':')[1],
          isSecure: false,
        },
      }),
    },
  );

  const paymentService = new LocalPaymentService(bobchain, storageDir);
  const payments: LocalPaymentService['EventTypes']['reserved'][] = [];
  const escrows: LocalPaymentService['EventTypes']['createdEscrow'][] = [];
  paymentService.on('reserved', payment => payments.push(payment));
  paymentService.on('createdEscrow', e => escrows.push(e));
  Helpers.needsClosing.push({ close: () => paymentService.close(), onlyCloseOnFinal: false });
  let metadata: IDatastoreMetadataResult;
  const client = new Client(`ulx://${domain}/@v${datastoreVersion}`, {
    paymentService,
    mainchainUrl,
    onQueryResult(result) {
      metadata = result.metadata;
    },
  });

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

}, 300e3);

test('it can do end to end payments with no domain', async () => {
  const buildDir = getPlatformBuild();

  const identityBech32 = execAndLog(
    `npx @ulixee/datastore admin-identity read --filename="${identityPath}"`,
  );
  expect(identityBech32).toContain('id1');
  const ferdieDomainProfitsAddress = ferdieKeystore.createAccountId(CryptoScheme.Sr25519);

  const cloudNode = new TestCloudNode(buildDir);
  Helpers.needsClosing.push({ close: () => cloudNode.close(), onlyCloseOnFinal: false });
  const cloudAddress = await cloudNode.start({
    ULX_CLOUD_ADMIN_IDENTITIES: identityBech32.trim(),
    ULX_IDENTITY_PATH: identityPath,
    ULX_MAINCHAIN_URL: mainchainUrl,
    ULX_LOCALCHAIN_BASE_PATH: ferdieBasePath,
    ULX_TAX_ADDRESS: ferdieDomainProfitsAddress,
    ULX_NOTARY_ID: '1',
  });
  expect(cloudAddress).toBeTruthy();
  Helpers.needsClosing.push({ close: () => cloudNode.close(), onlyCloseOnFinal: false });

  await uploadDatastore('no-domain', buildDir, cloudAddress, {
    payment: {
      notaryId: 1,
      address: ferdieDomainProfitsAddress,
    },
  });

  const bobchain = await LocalchainPaymentService.load({
    localchainPath: bobchainBasePath,
    mainchainUrl,
    datastoreFundingAddress: bobEscrowFunding.address,
    taxAddress: bobTaxAddress.address,
    escrowMilligonsStrategy: {
      type: 'multiplier',
      queries: 2,
    },
  });
  const account = await bobchain.localchain.accounts.get(bobEscrowFunding.address, AccountType.Deposit, 1);
  expect(account).toBeTruthy();
  const balance = await bobchain.localchain.balanceChanges.getLatestForAccount(account.id);
  expect(balance.balance).toBe('3600');

  const paymentService = new LocalPaymentService(bobchain, storageDir);
  const payments: LocalPaymentService['EventTypes']['reserved'][] = [];
  const escrows: LocalPaymentService['EventTypes']['createdEscrow'][] = [];
  paymentService.on('reserved', payment => payments.push(payment));
  paymentService.on('createdEscrow', e => escrows.push(e));
  let metadata: IDatastoreMetadataResult;
  const client = new Client(`ulx://${cloudAddress}/no-domain@v0.0.1`, {
    paymentService,
    mainchainUrl,
    onQueryResult(result) {
      metadata = result.metadata;
    },
  });

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
  expect(escrows[0].datastoreId).toBe("no-domain");
  expect(payments).toHaveLength(1);
  expect(payments[0].payment.microgons).toBe(1000);
  expect(payments[0].payment.escrow).toBeTruthy();
  expect(payments[0].payment.escrow.settledMilligons).toBe(5n);
  expect(payments[0].remainingBalance).toBe(5_000 - 1_000);
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

async function transferMainchainToLocalchain(
  mainchainClient: UlxClient,
  localchain: Localchain,
  account: KeyringPair,
  amount: number,
  notaryId: number,
): Promise<{
  notarization: NotarizationBuilder;
  balanceChange: BalanceChangeBuilder;
}> {
  const nonce = await transferToLocalchain(account, amount, notaryId, mainchainClient);
  const locMainchainClient = await localchain.mainchainClient;
  const transfer = await locMainchainClient.waitForLocalchainTransfer(account.address, nonce);
  const notarization = localchain.beginChange();
  const balanceChange = await notarization.claimFromMainchain(transfer);
  return { notarization, balanceChange };
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

  await new Promise((resolve, reject) =>
    client.tx.dataDomain
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
      }),
  );
}

async function transferToLocalchain(
  account: KeyringPair,
  amount: number,
  viaNotaryId: number,
  client: UlxClient,
): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    void client.tx.chainTransfer
      .sendToLocalchain(amount, viaNotaryId)
      .signAndSend(account, ({ events, status }) => {
        if (status.isFinalized) {
          checkForExtrinsicSuccess(events, client)
            .then(() => {
              for (const { event } of events) {
                if (client.events.chainTransfer.TransferToLocalchain.is(event)) {
                  const nonce = event.data.accountNonce.toPrimitive() as number;
                  resolve(nonce);
                }
              }
              return null;
            })
            .catch(reject);
        }
        if (status.isInBlock) {
          checkForExtrinsicSuccess(events, client).catch(reject);
        }
      });
  });
}

async function activateNotary(sudo: KeyringPair, client: UlxClient, notary: TestNotary) {
  await notary.register(client);
  await new Promise<void>((resolve, reject) => {
    void client.tx.sudo
      .sudo(client.tx.notaries.activate(notary.operator.publicKey))
      .signAndSend(sudo, ({ events, status }) => {
        if (status.isInBlock) {
          return checkForExtrinsicSuccess(events, client).then(() => {
            console.log(`Successful activation of notary in block ${status.asInBlock.toHex()}`);
            return resolve();
          }, reject);
        }
        console.log(`Status of notary activation: ${status.type}`);
      });
  });
}
