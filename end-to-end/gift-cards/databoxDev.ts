import { safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';
import IDataboxManifest from '@ulixee/specification/types/IDataboxManifest';
import { spawn } from 'child_process';
import * as Path from 'path';
import { execAndLog, getServerHost } from '../utils';

export default async function main(
  sidechainHost: string,
  needsClosing: (() => Promise<any> | any)[],
  rootDir: string,
): Promise<{
  claimGiftCard: string;
  databoxHost: string;
  databoxHash: string;
}> {
  // CREATE IDENTITIES
  const addressPath = Path.resolve(`${__dirname}/addresses/DataboxDevGiftCard.json`);
  const identityPath = Path.resolve(`${__dirname}/identities/DataboxDev.json`);

  execAndLog(`npx @ulixee/crypto identity --filename="${identityPath}"`, {
    stdio: 'inherit',
  });
  const addressResult = execAndLog(`npx @ulixee/crypto address U "${addressPath}"`, {
    encoding: 'utf8',
  });
  const giftCardAddress = addressResult.split('Wrote address: ').pop().split(' ')[0].trim();

  // BOOT UP A SERVER WITH GIFT CARD RESTRICTIONS
  const databoxServer = spawn(`npx @ulixee/server start`, {
    stdio: 'pipe',
    cwd: rootDir,
    shell: true,
    env: {
      ...process.env,
      ULX_GIFT_CARD_ADDRESS: giftCardAddress,
      ULX_SIDECHAIN_HOST: sidechainHost,
      ULX_IDENTITY_PATH: identityPath,
      ULX_DISABLE_CHROMEALIVE: 'true'
    },
  });
  const databoxHost = await getServerHost(databoxServer);
  needsClosing.push(() => databoxServer.kill());

  const giftCardResult = execAndLog(
    `npx @ulixee/sidechain gift-card create -m 500c -h ${sidechainHost}`,
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        ULX_ADDRESS: addressPath,
      },
    },
  );
  const claimGiftCard = giftCardResult.split(': "').pop().replace('"', '').trim();
  if (!claimGiftCard) throw new Error('Did not create a gift card');
  console.log('Claim gift card instructions:', claimGiftCard);

  await safeOverwriteFile(
    `${__dirname}/databox/index-manifest.json`,
    JSON.stringify({
      giftCardAddress,
      pricePerQuery: 50e4, // ~50 cents
    } as Partial<IDataboxManifest>),
  );
  const databoxResult = execAndLog(
    `npx @ulixee/databox deploy ./databox/index.js -h ${databoxHost}`,
    {
      cwd: __dirname,
      encoding: 'utf8',
    },
  );

  console.log(databoxResult);
  const databoxMatch = databoxResult.match(/\/databox\/dbx1(?:[0-9a-z]{58})/g);
  const databoxHash = databoxMatch[0].trim().replace('/databox/', '');
  console.log('Databox VersionHash', databoxHash);

  return {
    claimGiftCard,
    databoxHash,
    databoxHost,
  };
}
