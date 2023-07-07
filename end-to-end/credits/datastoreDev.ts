import { spawn } from 'child_process';
import * as Path from 'path';
import assert = require('assert');
import { execAndLog, getCloudAddress } from '../utils';

export default async function main(
  needsClosing: (() => Promise<any> | any)[],
  rootDir: string,
): Promise<{
  creditUrl: string;
  cloudAddress: string;
  datastoreId: string;
  datastoreVersion: string;
}> {
  // CREATE IDENTITIES
  const identityPath = Path.resolve(`${__dirname}/identities/DatastoreDev.json`);
  execAndLog(`npx @ulixee/crypto identity --filename="${identityPath}"`, {
    stdio: 'inherit',
  });

  const identityBech32 = execAndLog(
    `npx @ulixee/crypto read-identity --filename="${identityPath}"`,
  );
  assert(identityBech32, 'Must be a valid identity');

  // BOOT UP A CLOUD WITH GIFT CARD RESTRICTIONS
  const cloudNode = spawn(`npx @ulixee/cloud start`, {
    stdio: 'pipe',
    cwd: rootDir,
    shell: true,
    env: {
      ...process.env,
      ULX_CLOUD_ADMIN_IDENTITIES: identityBech32,
      ULX_IDENTITY_PATH: identityPath,
      ULX_DISABLE_CHROMEALIVE: 'true',
    },
  });
  const cloudAddress = await getCloudAddress(cloudNode);
  needsClosing.push(() => cloudNode.kill());

  // For some reason, nodejs is taking CWD, but then going to closest package.json, so have to prefix with ./credits
  execAndLog(`npx @ulixee/datastore deploy -h ${cloudAddress} ./credits/datastore/index.js`, {
    cwd: __dirname,
    env: {
      ...process.env,
      ULX_IDENTITY_PATH: identityPath,
    },
  });
  const datastoreId = 'end-to-end';
  const datastoreVersion = '0.0.1';

  const creditResult = execAndLog(
    `npx @ulixee/datastore credits create --argons=5 ${cloudAddress}/${datastoreId}@v${datastoreVersion}`,
    {
      cwd: __dirname,
      env: {
        ...process.env,
        ULX_IDENTITY_PATH: identityPath,
      },
    },
  );

  const creditUrl = creditResult.split('\n\n').filter(Boolean).pop().trim();
  console.log('Store Credit URL:', creditUrl);

  return {
    creditUrl,
    datastoreId,
    datastoreVersion,
    cloudAddress,
  };
}
