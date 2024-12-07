import { DomainStore, Localchain } from '@argonprotocol/localchain';
import { decodeAddress, getClient, Keyring, KeyringPair } from '@argonprotocol/mainchain';
import Client from '@ulixee/client';
import { Helpers } from '@ulixee/datastore-testing';
import DatastoreApiClients from '@ulixee/datastore/lib/DatastoreApiClients';
import DefaultPaymentService from '@ulixee/datastore/payments/DefaultPaymentService';
import LocalchainWithSync from '@ulixee/datastore/payments/LocalchainWithSync';
import { IDatastoreMetadataResult } from '@ulixee/platform-specification/datastore/DatastoreApis';
import { gettersToObject } from '@ulixee/platform-utils/lib/objectUtils';
import * as Path from 'node:path';

import { format } from 'node:util';
import { inspect } from 'util';
import TestCloudNode, { uploadDatastore } from '../lib/TestCloudNode';
import { describeIntegration } from '../lib/testHelpers';
import TestMainchain, { activateNotary, registerZoneRecord } from '../lib/TestMainchain';
import TestNotary from '../lib/TestNotary';
import { execAndLog, getPlatformBuild } from '../lib/utils';
import { mkdir } from 'node:fs/promises';

afterEach(Helpers.afterEach);
afterAll(Helpers.afterAll);
const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'e2e.payments.test');

let argonMainchainUrl: string;
const identityPath = Path.join(storageDir, 'DatastoreDev.pem');

let ferdie: KeyringPair;
inspect.defaultOptions.depth = 10;

// this stops jest from killing the logs
global.console.log = (...args) => process.stdout.write(`${format(...args)}\n`);

describeIntegration('Payments E2E', () => {
  beforeAll(async () => {
    const mainchain = new TestMainchain();
    argonMainchainUrl = await mainchain.launch(1);
    const notary = new TestNotary();
    await notary.start(argonMainchainUrl);
    await mkdir(storageDir, { recursive: true });

    ferdie = new Keyring({ type: 'sr25519' }).createFromUri('//Ferdie');
    const sudo = new Keyring({ type: 'sr25519' }).createFromUri('//Alice');
    const mainchainClient = await getClient(argonMainchainUrl);

    await activateNotary(sudo, mainchainClient, notary);
    await mainchainClient.disconnect();

    execAndLog(`npx @ulixee/datastore admin-identity create --filename="${identityPath}"`);

    execAndLog(
      `npx @argonprotocol/localchain accounts create --name=bobchain --suri="//Bob" --scheme=sr25519 --base-dir="${storageDir}"`,
    );
  }, 60e3);

  test('it can do end to end payments flow for a domain datastore', async () => {
    const buildDir = getPlatformBuild();

    const mainchainClient = await getClient(argonMainchainUrl);
    Helpers.onClose(() => mainchainClient.disconnect());

    const bobchain = await LocalchainWithSync.load({
      localchainPath: Path.join(storageDir, 'bobchain.db'),
      mainchainUrl: argonMainchainUrl,
      disableAutomaticSync: true,
      channelHoldAllocationStrategy: {
        type: 'multiplier',
        queries: 2,
      },
    });

    execAndLog(
      `npx @argonprotocol/localchain accounts create --name=ferdiechain --suri="//Ferdie" --scheme=sr25519 --base-dir="${storageDir}"`,
    );
    const ferdiechain = await Localchain.load({
      mainchainUrl: argonMainchainUrl,
      path: Path.join(storageDir, 'ferdiechain.db'),
    });
    Helpers.onClose(() => ferdiechain.close());

    const ferdieVotesAddress = ferdie.derive('//votes').address;

    const domain = 'e2e.communication';
    // Hangs with the proxy url. Not sure why
    if (!process.env.ULX_USE_DOCKER_BINS) {
      const isDomainRegistered = execAndLog(
        `npx @argonprotocol/localchain domains check ${domain} -m "${argonMainchainUrl}"`,
      );
      expect(isDomainRegistered).toContain(' No ');
      console.log('Domain registered?', isDomainRegistered);
    }
    const domainHash = DomainStore.getHash(domain);
    await Promise.all([
      ferdiechain.mainchainTransfers.sendToLocalchain(1_000_000n, 1),
      bobchain.mainchainTransfers.sendToLocalchain(5_000_000n, 1),
    ]);

    let isSynched = false;
    while (!isSynched) {
      await ferdiechain.balanceSync.sync({});
      await bobchain.balanceSync.sync({});
      const ferdieOverview = await ferdiechain.accountOverview();
      const bobOverview = await bobchain.accountOverview();
      isSynched = ferdieOverview.balance === 1_000_000n && bobOverview.balance === 5_000_000n;
      await new Promise(resolve =>
        setTimeout(resolve, Number(ferdiechain.ticker.millisToNextTick())),
      );
    }

    {
      const ferdieChange = ferdiechain.beginChange();
      await ferdieChange.leaseDomain(domain, await ferdiechain.address);
      await ferdieChange.notarizeAndWaitForNotebook();
    }

    const identityBech32 = execAndLog(
      `npx @ulixee/datastore admin-identity read --filename="${identityPath}"`,
    )
      .split(/\r?\n/)
      .shift()
      .trim();
    expect(identityBech32).toContain('id1');
    const cloudNode = new TestCloudNode(buildDir, false);
    const cloudAddress = await cloudNode.start({
      ULX_CLOUD_ADMIN_IDENTITIES: identityBech32,
      ULX_IDENTITY_PATH: identityPath,
      ULX_DATASTORE_DIR: storageDir,
      ARGON_MAINCHAIN_URL: argonMainchainUrl,
      ARGON_LOCALCHAIN_PATH: ferdiechain.path,
      ARGON_BLOCK_REWARDS_ADDRESS: ferdieVotesAddress,
      ARGON_NOTARY_ID: '1',
      RUST_LOG: 'debug,sqlx=warn',
    });
    expect(cloudAddress).toBeTruthy();
    Helpers.onClose(() => cloudNode.close());

    const datastoreId = 'end-to-end';
    const datastoreVersion = '0.0.1';
    await uploadDatastore(
      datastoreId,
      buildDir,
      cloudAddress,
      {
        domain,
      },
      identityPath,
    );

    await registerZoneRecord(
      mainchainClient,
      domainHash,
      ferdie,
      decodeAddress(ferdie.address, false, 42),
      1,
      {
        [datastoreVersion]: mainchainClient.createType('ArgonPrimitivesDomainVersionHost', {
          datastoreId: mainchainClient.createType('Bytes', datastoreId),
          host: mainchainClient.createType('Bytes', `ws://127.0.0.1:${cloudAddress.split(':')[1]}`),
        }),
      },
    );

    const datastoreApiClients = new DatastoreApiClients();
    Helpers.onClose(() => datastoreApiClients.close());
    const paymentService = await bobchain.createPaymentService(datastoreApiClients);

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
        microgons: 500_000n,
        milliseconds: expect.any(Number),
        bytes: expect.any(Number),
      }),
    );

    expect(channelHolds).toHaveLength(1);
    expect(channelHolds[0].allocatedMicrogons).toBe(1_000_000n);
    expect(channelHolds[0].datastoreId).toBe(datastoreId);
    expect(payments).toHaveLength(1);
    expect(payments[0].payment.microgons).toBe(500_000n);
    expect(payments[0].payment.channelHold).toBeTruthy();
    expect(payments[0].payment.channelHold.settledMicrogons).toBe(500_000n);
    expect(payments[0].remainingBalance).toBe(500_000n);

    const balance = await bobchain.accountOverview();
    console.log('Balance:', await gettersToObject(balance));
    expect(balance.balance).toBe(4_800_000n);
    expect(balance.heldBalance).toBe(1_000_000n);
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

    const cloudNode = new TestCloudNode(buildDir, false);
    const cloudAddress = await cloudNode.start({
      ULX_CLOUD_ADMIN_IDENTITIES: identityBech32.trim(),
      ULX_IDENTITY_PATH: identityPath,
      ULX_DATASTORE_DIR: storageDir,
      ARGON_MAINCHAIN_URL: argonMainchainUrl,
      ARGON_LOCALCHAIN_PATH: Path.join(storageDir, 'ferdiechain.db'),
      ARGON_NOTARY_ID: '1',
    });
    expect(cloudAddress).toBeTruthy();

    await uploadDatastore(
      'no-domain',
      buildDir,
      cloudAddress,
      {
        version: '0.0.2',
      },
      identityPath,
    );

    const bobchain = await LocalchainWithSync.load({
      localchainPath: Path.join(storageDir, 'bobchain.db'),
      mainchainUrl: argonMainchainUrl,
      channelHoldAllocationStrategy: {
        type: 'multiplier',
        queries: 2,
      },
    });
    Helpers.onClose(() => bobchain.close());
    const wallet = await bobchain.accountOverview();
    // ensure wallet is loaded
    expect(wallet.balance).toBe(4_800_000n);

    const paymentService = await bobchain.createPaymentService(new DatastoreApiClients());
    const payments: DefaultPaymentService['EventTypes']['reserved'][] = [];
    const channelHolds: DefaultPaymentService['EventTypes']['createdChannelHold'][] = [];
    paymentService.on('reserved', payment => payments.push(payment));
    paymentService.on('createdChannelHold', e => channelHolds.push(e));
    let metadata: IDatastoreMetadataResult;
    const client = new Client(`ulx://${cloudAddress}/no-domain@v0.0.2`, {
      paymentService,
      argonMainchainUrl,
      onQueryResult(result) {
        metadata = result.metadata;
      },
    });
    Helpers.onClose(() => client.disconnect());

    const result = await client.query('SELECT * FROM nod()');

    expect(result).toEqual([{ noDomain: true }]);
    expect(metadata).toEqual(
      expect.objectContaining({
        microgons: 1_000n,
        milliseconds: expect.any(Number),
        bytes: expect.any(Number),
      }),
    );
    expect(channelHolds).toHaveLength(1);
    expect(channelHolds[0].allocatedMicrogons).toBe(5_000n);
    expect(channelHolds[0].datastoreId).toBe('no-domain');
    expect(payments).toHaveLength(1);
    expect(payments[0].payment.microgons).toBe(1_000n);
    expect(payments[0].payment.channelHold).toBeTruthy();
    expect(payments[0].payment.channelHold.settledMicrogons).toBe(5_000n);
    expect(payments[0].remainingBalance).toBe(5_000n - 1_000n);

    const balance = await bobchain.accountOverview();
    console.log('Balance:', await gettersToObject(balance));
    // only sending 205_000 to jump account, means we'll only pay 20% on the amount
    expect(balance.balance).toBe(4_800_000n - BigInt(205_000 * 0.2));
    expect(balance.heldBalance).toBe(1_005_000n);
  });
});
