import CreditsStore from '@ulixee/datastore/lib/CreditsStore';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { execAndLog } from '../utils';

export default async function main(
  datastore: {
    creditUrl: string;
    cloudAddress: string;
    datastoreId: string;
    datastoreVersion: string;
  },
  rootDir: string,
): Promise<void> {
  const { datastoreId, datastoreVersion, creditUrl, cloudAddress } = datastore;

  execAndLog(`npx @ulixee/datastore credits install ${creditUrl}`, {
    cwd: rootDir,
    stdio: 'inherit',
  });

  const datastoreClient = new DatastoreApiClient(cloudAddress);
  const pricing = await datastoreClient.getExtractorPricing(datastoreId, datastoreVersion, 'default');
  const payment = await CreditsStore.getPayment(datastoreId, datastoreVersion, pricing.minimumPrice);

  const result = await datastoreClient.query(
    datastoreId,
    datastoreVersion,
    'SELECT * FROM default(test => $1)',
    {
      boundValues: [1],
      payment,
    },
  );

  console.log('Result of datastore query is:', result);

  execAndLog(`npx @ulixee/datastore credits get ${creditUrl}`, {
    cwd: rootDir,
    stdio: 'inherit',
  });
}
