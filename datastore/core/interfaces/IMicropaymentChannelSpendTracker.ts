import IMicropaymentChannelApiTypes from '@ulixee/platform-specification/services/MicropaymentChannelApis';
import IDatastoreManifest, {
  IDatastorePaymentRecipient,
} from '@ulixee/platform-specification/types/IDatastoreManifest';

export default interface IMicropaymentChannelSpendTracker {
  getPaymentInfo(): Promise<IDatastorePaymentRecipient>;
  debit(
    data: IMicropaymentChannelApiTypes['MicropaymentChannel.debitPayment']['args'],
  ): Promise<IMicropaymentChannelApiTypes['MicropaymentChannel.debitPayment']['result']>;

  finalize(
    data: IMicropaymentChannelApiTypes['MicropaymentChannel.finalizePayment']['args'],
  ): Promise<IMicropaymentChannelApiTypes['MicropaymentChannel.finalizePayment']['result']>;

  importChannelHold(
    data: IMicropaymentChannelApiTypes['MicropaymentChannel.importChannelHold']['args'],
    datastoreManifest: IDatastoreManifest,
  ): Promise<IMicropaymentChannelApiTypes['MicropaymentChannel.importChannelHold']['result']>;
}
