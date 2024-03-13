import { Keyring } from '@polkadot/keyring';
import { Helpers } from '@ulixee/datastore-testing';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import LocalPaymentService from '@ulixee/datastore/payments/LocalPaymentService';
import { writeFile } from 'node:fs/promises';
import * as Path from 'node:path';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import TestCloudNode from '../lib/TestCloudNode';
import { execAndLog, getPlatformBuild } from '../lib/utils';

afterEach(Helpers.afterEach);
afterAll(Helpers.afterAll);
const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'e2eCredits.test');

test('it can create a datastore with credits using cli', async () => {
  const buildDir = getPlatformBuild();
  const identityPath = Path.join(storageDir, 'DatastoreDev.pem');
  execAndLog(`npx @ulixee/datastore admin-identity create --filename="${identityPath}"`);

  const identityBech32 = execAndLog(
    `npx @ulixee/datastore admin-identity read --filename="${identityPath}"`,
  );
  expect(identityBech32).toContain('id1');

  const cloudNode = new TestCloudNode(buildDir);
  const cloudAddress = await cloudNode.start({
    ULX_CLOUD_ADMIN_IDENTITIES: identityBech32.trim(),
    ULX_IDENTITY_PATH: identityPath,
  });
  expect(cloudAddress).toBeTruthy();

  const datastorePath = Path.join('end-to-end', 'test', 'datastore', 'credits.js');
  await writeFile(
    Path.join(buildDir, datastorePath.replace('.js', '-manifest.json')),
    JSON.stringify(<Partial<IDatastoreManifest>>{
      payment: {
        notaryId: 1,
        address: new Keyring().createFromUri('//Alice').address,
      },
    }),
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
  const datastoreId = 'credits';
  const datastoreVersion = '0.0.1';

  const creditResult = execAndLog(
    `npx @ulixee/datastore credits create --argons=5 ${cloudAddress}/${datastoreId}@v${datastoreVersion}`,
    {
      env: {
        ...process.env,
        ULX_IDENTITY_PATH: identityPath,
      },
    },
  );

  expect(creditResult).toContain(`${datastoreId}@v${datastoreVersion}`);
  const creditUrl = creditResult.split('\n\n').filter(Boolean).pop().trim();
  expect(creditUrl).toBeTruthy();

  execAndLog(`npx @ulixee/datastore credits install ${creditUrl} -d "${storageDir}"`, {
    cwd: storageDir,
  });

  const datastoreClient = new DatastoreApiClient(cloudAddress);
  Helpers.onClose(() => datastoreClient.disconnect());

  const paymentService = new LocalPaymentService(null, storageDir);

  const result = await datastoreClient.query(
    datastoreId,
    datastoreVersion,
    'SELECT * FROM default(test => $1)',
    {
      boundValues: [1],
      paymentService,
    },
  );

  console.log('Result of datastore query is:', result);

  const creditUpdate = execAndLog(`npx @ulixee/datastore credits get ${creditUrl}`);
  expect(creditUpdate.includes("4500000")).toBeTruthy();
}, 60e3);
