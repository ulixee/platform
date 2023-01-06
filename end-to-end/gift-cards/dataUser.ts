import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import SidechainClient from '@ulixee/sidechain';
import { execAndLog } from '../utils';

export default async function main(
  sidechainHost: string,
  datastore: {
    datastoreHost: string;
    datastoreHash: string;
    storeGiftCardCommand: string;
  },
  rootDir: string,
): Promise<void> {
  const { datastoreHash, datastoreHost, storeGiftCardCommand } = datastore;

  execAndLog(`${storeGiftCardCommand} -h ${sidechainHost}`, {
    cwd: rootDir,
    stdio: 'inherit',
  });

  const sidechainClient = new SidechainClient(sidechainHost, {});
  const datastoreClient = new DatastoreApiClient(datastoreHost);
  const pricing = await datastoreClient.getFunctionPricing(datastoreHash, 'default');
  const payment = await sidechainClient.createMicroPayment({
    microgons: pricing.minimumPrice,
    ...pricing,
  });
  const result = await datastoreClient.query(datastoreHash, 'SELECT * FROM default(test => $1)', {
    boundValues: [1],
    payment,
  });

  console.log('Result of datastore query is:', result);

  execAndLog(`npx @ulixee/sidechain gift-card balances -h ${sidechainHost}`, {
    cwd: rootDir,
    stdio: 'inherit',
  });
}
