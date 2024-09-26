import { ConnectionToCore } from '@ulixee/net';
import IMicropaymentChannelApiTypes, {
  IMicropaymentChannelApis,
} from '@ulixee/platform-specification/services/MicropaymentChannelApis';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import IMicropaymentChannelSpendTracker from '../interfaces/IMicropaymentChannelSpendTracker';

export default class MicropaymentChannelSpendTrackerClient
  implements IMicropaymentChannelSpendTracker
{
  constructor(readonly serviceClient: ConnectionToCore<IMicropaymentChannelApis, {}>) {}

  public getPaymentInfo(): Promise<IMicropaymentChannelApiTypes['MicropaymentChannel.getPaymentInfo']['result']> {
    return this.serviceClient.sendRequest({
      command: 'MicropaymentChannel.getPaymentInfo',
      args: [],
    });
  }

  public async debit(
    data: IMicropaymentChannelApiTypes['MicropaymentChannel.debitPayment']['args'],
  ): Promise<IMicropaymentChannelApiTypes['MicropaymentChannel.debitPayment']['result']> {
    return this.serviceClient.sendRequest({
      command: 'MicropaymentChannel.debitPayment',
      args: [data],
    });
  }

  public finalize(
    data: IMicropaymentChannelApiTypes['MicropaymentChannel.finalizePayment']['args'],
  ): Promise<IMicropaymentChannelApiTypes['MicropaymentChannel.finalizePayment']['result']> {
    return this.serviceClient.sendRequest({
      command: 'MicropaymentChannel.finalizePayment',
      args: [data],
    });
  }

  public async importChannelHold(
    data: IMicropaymentChannelApiTypes['MicropaymentChannel.importChannelHold']['args'],
    _datastoreManifest: IDatastoreManifest,
  ): Promise<IMicropaymentChannelApiTypes['MicropaymentChannel.importChannelHold']['result']> {
    return this.serviceClient.sendRequest({
      command: 'MicropaymentChannel.importChannelHold',
      args: [data] as any,
    });
  }
}
