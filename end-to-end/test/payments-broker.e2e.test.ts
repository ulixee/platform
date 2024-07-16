import { decodeAddress } from '@polkadot/util-crypto';
import Client from '@ulixee/client';
import { Helpers } from '@ulixee/datastore-testing';
import DefaultPaymentService from '@ulixee/datastore/payments/DefaultPaymentService';
import { DataDomainStore, Localchain } from '@ulixee/localchain';
import { getClient, Keyring, KeyringPair } from '@ulixee/mainchain';
import { IDatastoreMetadataResult } from '@ulixee/platform-specification/datastore/DatastoreApis';
import Identity from '@ulixee/platform-utils/lib/Identity';
import * as Path from 'node:path';
import { inspect } from 'util';
import { waitForSynchedBalance } from '../lib/localchainHelpers';
import TestCloudNode, { uploadDatastore } from '../lib/TestCloudNode';
import TestDatabroker from '../lib/TestDatabroker';
import { describeIntegration } from '../lib/testHelpers';
import TestMainchain, { activateNotary, registerZoneRecord } from '../lib/TestMainchain';
import TestNotary from '../lib/TestNotary';
import { execAndLog, getPlatformBuild } from '../lib/utils';

afterEach(Helpers.afterEach);
afterAll(Helpers.afterAll);
const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'e2e.payments-broker.test');

let mainchainUrl: string;
let brokerAddress: string;
let broker: TestDatabroker;
const clientUserPath = Path.join(storageDir, 'DatastoreClient.pem');
const identityPath = Path.join(storageDir, 'DatastoreDev.pem');

let ferdie: KeyringPair;
inspect.defaultOptions.depth = 10;

describeIntegration('Payments with Broker E2E', () => {
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
      `npx @ulixee/localchain accounts create brokerchain --suri="//Bob" --scheme=sr25519 --base-dir="${storageDir}"`,
    );

    broker = new TestDatabroker();
    brokerAddress = await broker.start({
      ULX_DATABROKER_DIR: storageDir,
      ULX_MAINCHAIN_URL: mainchainUrl,
      ULX_LOCALCHAIN_PATH: Path.join(storageDir, 'brokerchain.db'),
    });
    console.log('booted up', brokerAddress, broker.adminAddress);
  }, 60e3);


  test('it can use a databroker for a domain datastore', async () => {
    const brokerchain = await Localchain.load({
      path: Path.join(storageDir, 'brokerchain.db'),
      mainchainUrl,
    });
    Helpers.onClose(() => brokerchain.close());

    execAndLog(
      `npx @ulixee/localchain accounts create ferdiechain --suri="//Ferdie" --scheme=sr25519 --base-dir="${storageDir}"`,
    );
    const ferdiechain = await Localchain.load({
      mainchainUrl,
      path: Path.join(storageDir, 'ferdiechain.db'),
    });
    Helpers.onClose(() => ferdiechain.close());

    const ferdieVotesAddress = ferdie.derive('//votes').address;

    await Promise.all([
      ferdiechain.mainchainTransfers.sendToLocalchain(1000n, 1),
      brokerchain.mainchainTransfers.sendToLocalchain(5000n, 1),
    ]);

    await Promise.all([
      waitForSynchedBalance(ferdiechain, 1000n),
      waitForSynchedBalance(brokerchain, 5000n),
    ]);

    const domain = 'broker.communication';
    const datastoreId = 'broker';
    const datastoreVersion = '0.0.1';
    await setupDatastore(
      ferdiechain,
      ferdie,
      domain,
      datastoreId,
      datastoreVersion,
      ferdieVotesAddress,
    );

    execAndLog(`npx @ulixee/datastore admin-identity create --filename="${clientUserPath}"`);
    await broker.registerUser(clientUserPath, 1000n);
    await broker.whitelistDomain(domain);
    const paymentService = await DefaultPaymentService.fromBroker(
      brokerAddress,
      {
        pemPath: clientUserPath,
      },
      {
        type: 'default',
        milligons: 500n,
      },
    );
    const payments: DefaultPaymentService['EventTypes']['reserved'][] = [];
    const escrows: DefaultPaymentService['EventTypes']['createdEscrow'][] = [];
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
        microgons: 50_000,
        milliseconds: expect.any(Number),
        bytes: expect.any(Number),
      }),
    );

    expect(escrows).toHaveLength(1);
    expect(escrows[0].allocatedMilligons).toBe(500n);
    expect(escrows[0].datastoreId).toBe(datastoreId);
    expect(payments).toHaveLength(1);
    expect(payments[0].payment.microgons).toBe(50_000);
    expect(payments[0].payment.escrow).toBeTruthy();
    expect(payments[0].payment.escrow.settledMilligons).toBe(50n);
    expect(payments[0].remainingBalance).toBe(450e3);

    const clientIdentity = Identity.loadFromFile(clientUserPath);
    await expect(broker.getBalance(clientIdentity.bech32)).resolves.toBe(500n);
  }, 300e3);
});

async function setupDatastore(
  localchain: Localchain,
  domainOwner: KeyringPair,
  domain: string,
  datastoreId: string,
  version: string,
  votesAddress: string,
): Promise<void> {
  const buildDir = getPlatformBuild();
  const mainchainClient = await getClient(mainchainUrl);
  Helpers.onClose(() => mainchainClient.disconnect());

  {
    const registration = localchain.beginChange();
    await registration.leaseDataDomain(domain, await localchain.address);
    await registration.notarizeAndWaitForNotebook();
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
    ULX_LOCALCHAIN_PATH: localchain.path,
    ULX_VOTES_ADDRESS: votesAddress,
    ULX_NOTARY_ID: '1',
  });
  expect(cloudAddress).toBeTruthy();
  Helpers.onClose(() => cloudNode.close());
  await uploadDatastore(
    datastoreId,
    buildDir,
    cloudAddress,
    {
      domain,
      payment: {
        notaryId: 1,
        address: domainOwner.address,
      },
    },
    identityPath,
  );

  const dataDomainHash = DataDomainStore.getHash(domain);
  await registerZoneRecord(
    mainchainClient,
    dataDomainHash,
    domainOwner,
    decodeAddress(domainOwner.address, false, 42),
    1,
    {
      [version]: mainchainClient.createType('UlxPrimitivesDataDomainVersionHost', {
        datastoreId: mainchainClient.createType('Bytes', datastoreId),
        host: mainchainClient.createType('Bytes', `ws://127.0.0.1:${cloudAddress.split(':')[1]}`),
      }),
    },
  );
}
