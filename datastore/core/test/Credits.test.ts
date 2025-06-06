import { Chain, ChainIdentity } from '@argonprotocol/localchain';
import { Keyring } from '@argonprotocol/mainchain';
import { CloudNode } from '@ulixee/cloud';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import DatastorePackager from '@ulixee/datastore-packager';
import { Helpers } from '@ulixee/datastore-testing';
import cloneDatastore from '@ulixee/datastore/cli/cloneDatastore';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import ArgonReserver from '@ulixee/datastore/payments/ArgonReserver';
import CreditReserver from '@ulixee/datastore/payments/CreditReserver';
import DefaultPaymentService from '@ulixee/datastore/payments/DefaultPaymentService';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import Identity from '@ulixee/platform-utils/lib/Identity';
import * as Fs from 'fs';
import * as Path from 'path';
import MockArgonPaymentProcessor from './_MockArgonPaymentProcessor';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Credits.test');

let cloudNode: CloudNode;
let client: DatastoreApiClient;
const adminIdentity = Identity.createSync();

jest.spyOn<any, any>(UlixeeHostsConfig.global, 'save').mockImplementation(() => null);
let storageCounter = 0;
const keyring = new Keyring({ ss58Format: 18 });
const datastoreKeyring = keyring.createFromUri('Datastore');
const argonPaymentProcessorMock = new MockArgonPaymentProcessor();

const mainchainIdentity = {
  chain: Chain.Devnet,
  genesisHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
} as ChainIdentity;

beforeAll(async () => {
  if (Fs.existsSync(`${__dirname}/datastores/output-manifest.json`)) {
    Fs.unlinkSync(`${__dirname}/datastores/output-manifest.json`);
  }

  if (Fs.existsSync(`${__dirname}/datastores/output.dbx`)) {
    Fs.rmSync(`${__dirname}/datastores/output.dbx`, { recursive: true });
  }

  CreditReserver.defaultBasePath = Path.join(storageDir, `credits.json`);
  cloudNode = await Helpers.createLocalNode(
    {
      datastoreConfiguration: {
        datastoresDir: storageDir,
        datastoresTmpDir: Path.join(storageDir, 'tmp'),
      },
    },
    true,
    {
      address: datastoreKeyring.address,
      notaryId: 1,
      ...mainchainIdentity,
    },
  );
  client = new DatastoreApiClient(await cloudNode.address, { consoleLogErrors: true });
  Helpers.onClose(() => client.disconnect(), true);
});

beforeEach(() => {
  storageCounter += 1;
  ArgonReserver.baseStorePath = Path.join(storageDir, `payments-${storageCounter}`);
  CreditReserver.defaultBasePath = Path.join(storageDir, `credits-${storageCounter}`);
  argonPaymentProcessorMock.clear();
});

afterEach(Helpers.afterEach);
afterAll(Helpers.afterAll);

test('should be able run a Datastore with Credits', async () => {
  const packager = new DatastorePackager(`${__dirname}/datastores/output.js`);
  Fs.writeFileSync(
    `${__dirname}/datastores/output-manifest.json`,
    TypeSerializer.stringify({
      extractorsByName: {
        putout: {
          prices: [{ basePrice: 1000n }],
        },
      },
      adminIdentities: [adminIdentity.bech32],
      version: '0.0.2',
    } as Partial<IDatastoreManifest>),
  );

  const dbx = await packager.build();
  const manifest = packager.manifest;
  await client.upload(await dbx.tarGzip(), { identity: adminIdentity });

  await expect(
    client.query(manifest.id, manifest.version, 'SELECT * FROM putout()', {}),
  ).rejects.toThrow('requires payment');

  const credits = await client.createCredits(manifest.id, manifest.version, 1001n, adminIdentity);
  expect(credits).toEqual({
    id: expect.any(String),
    remainingCredits: 1001n,
    secret: expect.any(String),
  });

  await CreditReserver.storeCredit(
    manifest.id,
    manifest.version,
    client.connectionToCore.transport.host,
    credits,
  );
  const paymentService = new DefaultPaymentService();
  await paymentService.loadCredits();
  await expect(paymentService.credits()).resolves.toHaveLength(1);

  await expect(
    client.query(manifest.id, manifest.version, 'SELECT * FROM putout()', {
      paymentService,
    }),
  ).resolves.toEqual({
    outputs: [{ success: true }],
    metadata: {
      microgons: 1000n,
      bytes: expect.any(Number),
      milliseconds: expect.any(Number),
    },
    queryId: expect.any(String),
    latestVersion: manifest.version,
  });

  await expect(
    client.getCreditsBalance(manifest.id, manifest.version, credits.id),
  ).resolves.toEqual({
    balance: 1n,
    issuedCredits: 1001n,
  });

  await expect(
    client.query(manifest.id, manifest.version, 'SELECT * FROM putout()', {
      paymentService,
    }),
  ).rejects.toThrow(/Connect another payment source to continue/g);
});

test('should remove an empty Credits from the local cache', async () => {
  const manifest = { id: '1', version: '1.1.1' };
  const credits = { id: 'crd1', secret: 'hash', remainingCredits: 1250n };
  const paymentService = await CreditReserver.storeCredit(
    manifest.id,
    manifest.version,
    client.connectionToCore.transport.host,
    credits,
  );

  await expect(
    paymentService.reserve({
      id: manifest.id,
      host: client.connectionToCore.transport.host,
      version: manifest.version,
      microgons: 1250n,
      recipient: {
        address: datastoreKeyring.address,
        notaryId: 1,
        ...mainchainIdentity,
      },
    }),
  ).resolves.toEqual(
    expect.objectContaining({ credits: { id: credits.id, secret: credits.secret } }),
  );
  await expect(
    paymentService.reserve({
      id: manifest.id,
      host: client.connectionToCore.transport.host,
      version: manifest.version,
      microgons: 1n,
      recipient: {
        address: datastoreKeyring.address,
        notaryId: 1,
        ...mainchainIdentity,
      },
    }),
  ).rejects.toThrow('Insufficient credits balance');
});

test('should be able to embed Credits in a Datastore', async () => {
  const packager = new DatastorePackager(`${__dirname}/datastores/output.js`);
  Fs.writeFileSync(
    `${__dirname}/datastores/output-manifest.json`,
    TypeSerializer.stringify({
      extractorsByName: {
        putout: {
          prices: [{ basePrice: 1000n }],
        },
      },
      adminIdentities: [adminIdentity.bech32],
      version: '0.0.4',
    } as Partial<IDatastoreManifest>),
  );

  const dbx = await packager.build();
  const manifest = packager.manifest;
  await client.upload(await dbx.tarGzip(), { identity: adminIdentity });
  const credits = await client.createCredits(manifest.id, manifest.version, 2001, adminIdentity);

  await CreditReserver.storeCredit(
    manifest.id,
    manifest.version,
    client.connectionToCore.transport.host,
    credits,
  );
  const paymentService = new DefaultPaymentService();
  await paymentService.loadCredits();

  await expect(
    client.stream(
      manifest.id,
      manifest.version,
      'putout',
      {},
      {
        paymentService,
      },
    ),
  ).resolves.toEqual([{ success: true }]);

  await expect(
    client.getCreditsBalance(manifest.id, manifest.version, credits.id),
  ).resolves.toEqual({
    balance: 1001n,
    issuedCredits: 2001n,
  });

  await cloneDatastore(
    `ulx://${await cloudNode.address}/${manifest.id}@v${manifest.version}`,
    `${__dirname}/datastores/clone-output`,
    { embedCredits: credits },
  );
  Fs.writeFileSync(
    `${__dirname}/datastores/clone-output/datastore-manifest.json`,
    TypeSerializer.stringify({
      extractorsByName: {
        putout: {
          prices: [{ basePrice: 1000n }],
        },
      },
      adminIdentities: [adminIdentity.bech32],
    } as Partial<IDatastoreManifest>),
  );

  {
    const packager2 = new DatastorePackager(`${__dirname}/datastores/clone-output/datastore.ts`);
    const dbx2 = await packager2.build({ createTemporaryVersion: true });
    const manifest2 = packager2.manifest;
    await client.upload(await dbx2.tarGzip(), { identity: adminIdentity });
    const credits2 = await client.createCredits(
      manifest2.id,
      manifest2.version,
      1002n,
      adminIdentity,
    );
    const credit2Service = await CreditReserver.storeCredit(
      manifest2.id,
      manifest2.version,
      client.connectionToCore.transport.host,
      credits2,
    );
    paymentService.addCredit(credit2Service);

    await expect(
      client.stream(
        manifest2.id,
        manifest2.version,
        'putout',
        {},
        {
          paymentService,
        },
      ),
    ).resolves.toEqual([{ success: true }]);

    await expect(
      client.getCreditsBalance(manifest.id, manifest.version, credits.id),
    ).resolves.toEqual({
      balance: 1n,
      issuedCredits: 2001n,
    });
    await expect(
      client.getCreditsBalance(manifest2.id, manifest2.version, credits2.id),
    ).resolves.toEqual({
      balance: 2n,
      issuedCredits: 1002n,
    });
  }

  // @ts-expect-error
  expect(cloudNode.datastoreCore.vm.apiClientCache.apiClientCacheByUrl).toEqual({
    [`ulx://${await cloudNode.address}`]: expect.any(DatastoreApiClient),
  });
}, 60e3);
