import { spawn } from 'child_process';
import * as Path from 'path';
import * as Fs from 'fs';
import { execAndLog, getMinerHost } from '../utils';

export default async function main(
  sidechainHost: string,
  needsClosing: (() => Promise<any> | any)[],
  rootDir: string,
): Promise<{
  storeGiftCardCommand: string;
  datastoreHost: string;
  datastoreHash: string;
}> {
  // CREATE IDENTITIES
  const identityPath = Path.resolve(`${__dirname}/identities/DatastoreDev.json`);
  execAndLog(`npx @ulixee/crypto identity --filename="${identityPath}"`, {
    stdio: 'inherit',
  });
  await Fs.promises.writeFile(
    `${__dirname}/datastore/index-manifest.json`,
    JSON.stringify({
      pricePerQuery: 50e4, // ~50 cents
    }),
  );

  // BOOT UP A MINER WITH GIFT CARD RESTRICTIONS
  const miner = spawn(`npx @ulixee/miner start`, {
    stdio: 'pipe',
    cwd: rootDir,
    shell: true,
    env: {
      ...process.env,
      ULX_SIDECHAIN_HOST: sidechainHost,
      ULX_IDENTITY_PATH: identityPath,
      ULX_DISABLE_CHROMEALIVE: 'true',
    },
  });
  const datastoreHost = await getMinerHost(miner);
  needsClosing.push(() => miner.kill());

  const giftCardResult = execAndLog(
    `npx @ulixee/datastore gift-cards create ./datastore/index.js -m 500c -h ${sidechainHost}`,
    {
      cwd: __dirname,
    },
  );
  const storeGiftCardCommand = giftCardResult.split(': "').pop().replace(/"/g, '').trim();
  if (!storeGiftCardCommand) throw new Error('Did not create a gift card');
  console.log('Store gift card instructions:', storeGiftCardCommand);

  const datastoreResult = execAndLog(
    `npx @ulixee/datastore deploy ./datastore/index.js -h ${datastoreHost}`,
    {
      cwd: __dirname,
    },
  );

  console.log(datastoreResult);
  const datastoreMatch = datastoreResult.match(/\/datastore\/dbx1(?:[0-9a-z]{58})/g);
  const datastoreHash = datastoreMatch[0].trim().replace('/datastore/', '');
  console.log('Datastore VersionHash', datastoreHash);

  return {
    storeGiftCardCommand,
    datastoreHash,
    datastoreHost,
  };
}
