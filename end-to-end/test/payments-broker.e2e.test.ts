import { decodeAddress , getClient, Keyring, KeyringPair } from '@argonprotocol/mainchain';
import Client from '@ulixee/client';
import { Helpers } from '@ulixee/datastore-testing';
import DefaultPaymentService from '@ulixee/datastore/payments/DefaultPaymentService';
import { DomainStore, Localchain } from '@argonprotocol/localchain';
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

let argonMainchainUrl: string;
let brokerAddress: string;
let broker: TestDatabroker;
const clientUserPath = Path.join(storageDir, 'DatastoreClient.pem');
const identityPath = Path.join(storageDir, 'DatastoreDev.pem');

let ferdie: KeyringPair;
inspect.defaultOptions.depth = 10;

describeIntegration('Payments with Broker E2E', () => {
  beforeAll(async () => {
    const mainchain = new TestMainchain();
    argonMainchainUrl = await mainchain.launch();
    const notary = new TestNotary();
    await notary.start(argonMainchainUrl);

    ferdie = new Keyring({ type: 'sr25519' }).createFromUri('//Ferdie');
    const sudo = new Keyring({ type: 'sr25519' }).createFromUri('//Alice');
    const mainchainClient = await getClient(argonMainchainUrl);

    await activateNotary(sudo, mainchainClient, notary);
    await mainchainClient.disconnect();

    execAndLog(`npx @ulixee/datastore admin-identity create --filename="${identityPath}"`);

    execAndLog(
      `npx @argonprotocol/localchain accounts create --name=brokerchain --suri="//Bob" --scheme=sr25519 --base-dir="${storageDir}"`,
    );

    broker = new TestDatabroker();
    brokerAddress = await broker.start({
      ULX_DATABROKER_DIR: storageDir,
      ARGON_MAINCHAIN_URL: argonMainchainUrl,
      ARGON_LOCALCHAIN_PATH: Path.join(storageDir, 'brokerchain.db'),
    });
    console.log('booted up', brokerAddress, broker.adminAddress);
  }, 60e3);

  test('it can use a databroker for a domain datastore', async () => {
    const brokerchain = await Localchain.load({
      path: Path.join(storageDir, 'brokerchain.db'),
      mainchainUrl: argonMainchainUrl,
    });
    Helpers.onClose(() => brokerchain.close());

    execAndLog(
      `npx @argonprotocol/localchain accounts create --name=ferdiechain --suri="//Ferdie" --scheme=sr25519 --base-dir="${storageDir}"`,
    );
    const ferdiechain = await Localchain.load({
      mainchainUrl: argonMainchainUrl,
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
    const channelHolds: DefaultPaymentService['EventTypes']['createdChannelHold'][] = [];
    paymentService.on('reserved', payment => payments.push(payment));
    paymentService.on('createdChannelHold', e => channelHolds.push(e));
    Helpers.onClose(() => paymentService.close());

    let metadata: IDatastoreMetadataResult;
    const client = new Client(`ulx://${domain}/@v${datastoreVersion}`, {
      paymentService,
      argonMainchainUrl,
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

    expect(channelHolds).toHaveLength(1);
    expect(channelHolds[0].allocatedMilligons).toBe(500n);
    expect(channelHolds[0].datastoreId).toBe(datastoreId);
    expect(payments).toHaveLength(1);
    expect(payments[0].payment.microgons).toBe(50_000);
    expect(payments[0].payment.channelHold).toBeTruthy();
    expect(payments[0].payment.channelHold.settledMilligons).toBe(50n);
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
  const mainchainClient = await getClient(argonMainchainUrl);
  Helpers.onClose(() => mainchainClient.disconnect());

  {
    const registration = localchain.beginChange();
    await registration.leaseDomain(domain, await localchain.address);
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
    ARGON_MAINCHAIN_URL: argonMainchainUrl,
    ARGON_LOCALCHAIN_PATH: localchain.path,
    ARGON_BLOCK_REWARDS_ADDRESS: votesAddress,
    ARGON_NOTARY_ID: '1',
  });
  expect(cloudAddress).toBeTruthy();
  Helpers.onClose(() => cloudNode.close());
  await uploadDatastore(
    datastoreId,
    buildDir,
    cloudAddress,
    {
      domain,
    },
    identityPath,
  );

  const domainHash = DomainStore.getHash(domain);
  await registerZoneRecord(
    mainchainClient,
    domainHash,
    domainOwner,
    decodeAddress(domainOwner.address, false, 42),
    1,
    {
      [version]: mainchainClient.createType('ArgonPrimitivesDomainVersionHost', {
        datastoreId: mainchainClient.createType('Bytes', datastoreId),
        host: mainchainClient.createType('Bytes', `ws://127.0.0.1:${cloudAddress.split(':')[1]}`),
      }),
    },
  );
}
