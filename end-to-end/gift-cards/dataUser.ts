import DataboxApiClient from '@ulixee/databox/lib/DataboxApiClient';
import * as Path from 'path';
import SidechainClient from '@ulixee/sidechain';
import Address from '@ulixee/crypto/lib/Address';
import Identity from '@ulixee/crypto/lib/Identity';
import { execAndLog } from '../utils';

export default async function main(
  sidechainHost: string,
  databox: {
    databoxHost: string;
    databoxHash: string;
    claimGiftCard: string;
  },
  rootDir: string,
): Promise<void> {
  const { databoxHash, databoxHost, claimGiftCard } = databox;
  // CREATE IDENTITIES
  const addressPath = Path.resolve(`${__dirname}/addresses/DataboxDevGiftCard.json`);
  const identityPath = Path.resolve(`${__dirname}/identities/DataboxDev.json`);

  execAndLog(`npx @ulixee/crypto identity -f "${identityPath}"`, { stdio: 'inherit' });
  execAndLog(`npx @ulixee/crypto address U "${addressPath}"`);

  execAndLog(`${claimGiftCard} -h ${sidechainHost}`, {
    stdio: 'inherit',
    cwd: rootDir,
    env: {
      ...process.env,
      ULX_ADDRESS: addressPath,
    },
  });

  // TODO: use stream once available
  const sidechainClient = new SidechainClient(sidechainHost, {
    address: Address.readFromPath(addressPath),
    identity: Identity.loadFromFile(identityPath),
  });
  const databoxClient = new DataboxApiClient(databoxHost);
  const databoxMeta = await databoxClient.getMeta(databoxHash);
  const payment = await sidechainClient.createMicroPayment(databoxMeta);
  const result = await databoxClient.exec(databoxHash, { test: 1 }, payment);

  console.log('Result of databox query is:', result);

  execAndLog(`npx @ulixee/sidechain gift-card balances -h ${sidechainHost}`, {
    stdio: 'inherit',
    cwd: rootDir,
    env: {
      ...process.env,
      ULX_ADDRESS: addressPath,
    },
  });
}
