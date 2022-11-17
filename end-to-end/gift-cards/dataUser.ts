import DataboxApiClient from '@ulixee/databox/lib/DataboxApiClient';
import SidechainClient from '@ulixee/sidechain';
import { execAndLog } from '../utils';

export default async function main(
  sidechainHost: string,
  databox: {
    databoxHost: string;
    databoxHash: string;
    storeGiftCardCommand: string;
  },
  rootDir: string,
): Promise<void> {
  const { databoxHash, databoxHost, storeGiftCardCommand } = databox;

  execAndLog(`${storeGiftCardCommand} -h ${sidechainHost}`, {
    cwd: rootDir,
    stdio: 'inherit',
  });

  const sidechainClient = new SidechainClient(sidechainHost, {});
  const databoxClient = new DataboxApiClient(databoxHost);
  const databoxMeta = await databoxClient.getMeta(databoxHash);
  const payment = await sidechainClient.createMicroPayment(databoxMeta);
  const result = await databoxClient.exec(databoxHash, { test: 1 }, payment);

  console.log('Result of databox query is:', result);

  execAndLog(`npx @ulixee/sidechain gift-card balances -h ${sidechainHost}`, {
    cwd: rootDir,
    stdio: 'inherit',
  });
}
