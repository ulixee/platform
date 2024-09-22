import { ChannelHold } from '@argonprotocol/localchain';
import IBalanceChange from '@ulixee/platform-specification/types/IBalanceChange';
import MicropaymentChannelSpendTracker from '../lib/MicropaymentChannelSpendTracker';

export default class MockMicropaymentChannelSpendTracker {
  canSign = jest.spyOn(MicropaymentChannelSpendTracker.prototype, 'canSign' as any);
  updateSettlement = jest.spyOn(MicropaymentChannelSpendTracker.prototype, 'updateSettlement' as any);
  importToLocalchain = jest.spyOn(MicropaymentChannelSpendTracker.prototype, 'importToLocalchain' as any);
  timeForTick = jest.spyOn(MicropaymentChannelSpendTracker.prototype, 'timeForTick' as any);

  clear() {
    this.canSign.mockClear();
    this.importToLocalchain.mockClear();
    this.updateSettlement.mockClear();
    this.timeForTick.mockClear();
  }

  mock(
    onImport: (
      datastoreId: string,
      channelHold: IBalanceChange,
    ) => Pick<ChannelHold, 'id' | 'expirationTick' | 'holdAmount'>,
  ) {
    this.canSign.mockReturnValue(Promise.resolve(true));
    this.updateSettlement.mockResolvedValue(undefined);
    this.importToLocalchain.mockImplementation((datastoreId: string, channelHold: IBalanceChange) => {
      return onImport(datastoreId, channelHold);
    });
    this.timeForTick.mockImplementation((tick: number) => {
      const expiration = Date.now() + tick * 2000;
      return new Date(expiration);
    });
  }
}
