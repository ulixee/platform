import { Localchain } from '@ulixee/localchain';

export async function waitForSynchedBalance(
  localchain: Localchain,
  balance: bigint,
): Promise<void> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await localchain.balanceSync.sync({});
    const overview = await localchain.accountOverview();

    if (overview.balance === balance) return;
    await new Promise(resolve => setTimeout(resolve, Number(localchain.ticker.millisToNextTick())));
  }
}
