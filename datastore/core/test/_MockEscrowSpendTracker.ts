import { Escrow } from '@ulixee/localchain';
import IBalanceChange from '@ulixee/platform-specification/types/IBalanceChange';
import EscrowSpendTracker from '../lib/EscrowSpendTracker';

export default class MockEscrowSpendTracker {
  canSign = jest.spyOn(EscrowSpendTracker.prototype, 'canSign' as any);
  updateSettlement = jest.spyOn(EscrowSpendTracker.prototype, 'updateSettlement' as any);
  importToLocalchain = jest.spyOn(EscrowSpendTracker.prototype, 'importToLocalchain' as any);
  timeForTick = jest.spyOn(EscrowSpendTracker.prototype, 'timeForTick' as any);

  clear() {
    this.canSign.mockClear();
    this.importToLocalchain.mockClear();
    this.updateSettlement.mockClear();
    this.timeForTick.mockClear();
  }

  mock(
    onImport: (
      datastoreId: string,
      escrow: IBalanceChange,
    ) => Pick<Escrow, 'id' | 'expirationTick' | 'holdAmount'>,
  ) {
    this.canSign.mockReturnValue(Promise.resolve(true));
    this.updateSettlement.mockResolvedValue(undefined);
    this.importToLocalchain.mockImplementation((datastoreId: string, escrow: IBalanceChange) => {
      return onImport(datastoreId, escrow);
    });
    this.timeForTick.mockImplementation((tick: number) => {
      const expiration = Date.now() + tick * 2000;
      return new Date(expiration);
    });
  }
}
