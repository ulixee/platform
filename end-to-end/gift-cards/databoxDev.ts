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
  databoxHost: string;
  databoxHash: string;
}> {
  // CREATE IDENTITIES
  const identityPath = Path.resolve(`${__dirname}/identities/DataboxDev.json`);
  execAndLog(`npx @ulixee/crypto identity --filename="${identityPath}"`, {
    stdio: 'inherit',
  });
  await Fs.promises.writeFile(
    `${__dirname}/databox/index-manifest.json`,
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
  const databoxHost = await getMinerHost(miner);
  needsClosing.push(() => miner.kill());

  const giftCardResult = execAndLog(
    `npx @ulixee/databox gift-cards create ./databox/index.js -m 500c -h ${sidechainHost}`,
    {
      cwd: __dirname,
    },
  );
  const storeGiftCardCommand = giftCardResult.split(': "').pop().replace(/"/g, '').trim();
  if (!storeGiftCardCommand) throw new Error('Did not create a gift card');
  console.log('Store gift card instructions:', storeGiftCardCommand);

  const databoxResult = execAndLog(
    `npx @ulixee/databox deploy ./databox/index.js -h ${databoxHost}`,
    {
      cwd: __dirname,
    },
  );

  console.log(databoxResult);
  const databoxMatch = databoxResult.match(/\/databox\/dbx1(?:[0-9a-z]{58})/g);
  const databoxHash = databoxMatch[0].trim().replace('/databox/', '');
  console.log('Databox VersionHash', databoxHash);

  return {
    storeGiftCardCommand,
    databoxHash,
    databoxHost,
  };
}
