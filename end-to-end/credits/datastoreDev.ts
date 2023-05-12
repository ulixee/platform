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
  datastoreHash: string;
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
  const datastoreResult = execAndLog(
    `npx @ulixee/datastore deploy ./credits/datastore/index.js -h ${cloudAddress}`,
    {
      cwd: __dirname,
      env: {
        ...process.env,
        ULX_IDENTITY_PATH: identityPath,
      },
    },
  );

  console.log('datastoreResult', datastoreResult);
  const datastoreMatch = datastoreResult.match(/'dbx1(?:[02-9a-z]+)'/g);
  const datastoreHash = datastoreMatch[0].trim().replace(/'/g, '');
  console.log('Datastore VersionHash', datastoreHash);

  const creditResult = execAndLog(
    `npx @ulixee/datastore credits create ${cloudAddress}/datastore/${datastoreHash} --argons=5`,
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
    datastoreHash,
    cloudAddress,
  };
}
