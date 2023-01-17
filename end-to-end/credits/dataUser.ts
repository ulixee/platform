import CreditsStore from '@ulixee/datastore/lib/CreditsStore';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { execAndLog } from '../utils';

export default async function main(
  datastore: {
    credits: { id: string; secret: string; remainingCredits: number };
    minerHost: string;
    datastoreHash: string;
  },
  rootDir: string,
): Promise<void> {
  const { datastoreHash, credits, minerHost } = datastore;

  execAndLog(
    `npx @ulixee/datastore credits install ${minerHost}/${datastoreHash}/credits/${credits.id} ${credits.secret}`,
    {
      cwd: rootDir,
      stdio: 'inherit',
    },
  );

  const datastoreClient = new DatastoreApiClient(minerHost);
  const pricing = await datastoreClient.getFunctionPricing(datastoreHash, 'default');
  const payment = await CreditsStore.getPayment(datastoreHash, pricing.minimumPrice);

  const result = await datastoreClient.query(datastoreHash, 'SELECT * FROM default(test => $1)', {
    boundValues: [1],
    payment,
  });

  console.log('Result of datastore query is:', result);

  execAndLog(`npx @ulixee/datastore credits get ${minerHost}/${datastoreHash} ${credits.id}`, {
    cwd: rootDir,
    stdio: 'inherit',
  });
}
