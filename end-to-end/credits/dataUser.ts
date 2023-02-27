import CreditsStore from '@ulixee/datastore/lib/CreditsStore';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { execAndLog } from '../utils';

export default async function main(
  datastore: {
    creditUrl: string;
    cloudAddress: string;
    datastoreHash: string;
  },
  rootDir: string,
): Promise<void> {
  const { datastoreHash, creditUrl, cloudAddress } = datastore;

  execAndLog(`npx @ulixee/datastore credits install ${creditUrl}`, {
    cwd: rootDir,
    stdio: 'inherit',
  });

  const datastoreClient = new DatastoreApiClient(cloudAddress);
  const pricing = await datastoreClient.getRunnerPricing(datastoreHash, 'default');
  const payment = await CreditsStore.getPayment(datastoreHash, pricing.minimumPrice);

  const result = await datastoreClient.query(datastoreHash, 'SELECT * FROM default(test => $1)', {
    boundValues: [1],
    payment,
  });

  console.log('Result of datastore query is:', result);

  execAndLog(`npx @ulixee/datastore credits get ${creditUrl}`, {
    cwd: rootDir,
    stdio: 'inherit',
  });
}
