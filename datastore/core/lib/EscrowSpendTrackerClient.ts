import { ConnectionToCore } from '@ulixee/net';
import IEscrowServiceApiTypes, {
  IEscrowServiceApis,
} from '@ulixee/platform-specification/services/EscrowServiceApis';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import IEscrowSpendTracker from '../interfaces/IEscrowSpendTracker';

export default class EscrowSpendTrackerClient implements IEscrowSpendTracker {
  constructor(readonly serviceClient: ConnectionToCore<IEscrowServiceApis, {}>) {}

  public async debit(
    data: IEscrowServiceApiTypes['EscrowService.debitPayment']['args'],
  ): Promise<IEscrowServiceApiTypes['EscrowService.debitPayment']['result']> {
    return this.serviceClient.sendRequest({
      command: 'EscrowService.debitPayment',
      args: [data],
    });
  }

  public finalize(
    data: IEscrowServiceApiTypes['EscrowService.finalizePayment']['args'],
  ): Promise<IEscrowServiceApiTypes['EscrowService.finalizePayment']['result']> {
    return this.serviceClient.sendRequest({
      command: 'EscrowService.finalizePayment',
      args: [data],
    });
  }

  public async importEscrow(
    data: IEscrowServiceApiTypes['EscrowService.importEscrow']['args'],
    _datastoreManifest: IDatastoreManifest,
  ): Promise<IEscrowServiceApiTypes['EscrowService.importEscrow']['result']> {
    return this.serviceClient.sendRequest({
      command: 'EscrowService.importEscrow',
      args: [data] as any,
    });
  }
}
