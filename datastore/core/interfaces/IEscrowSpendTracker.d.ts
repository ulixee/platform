import IEscrowServiceApiTypes from '@ulixee/platform-specification/services/EscrowServiceApis';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
export default interface IEscrowSpendTracker {
    debit(data: IEscrowServiceApiTypes['EscrowService.debitPayment']['args']): Promise<IEscrowServiceApiTypes['EscrowService.debitPayment']['result']>;
    finalize(data: IEscrowServiceApiTypes['EscrowService.finalizePayment']['args']): Promise<IEscrowServiceApiTypes['EscrowService.finalizePayment']['result']>;
    importEscrow(data: IEscrowServiceApiTypes['EscrowService.importEscrow']['args'], datastoreManifest: IDatastoreManifest): Promise<IEscrowServiceApiTypes['EscrowService.importEscrow']['result']>;
}
