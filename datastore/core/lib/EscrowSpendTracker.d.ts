import IEscrowServiceApiTypes from '@ulixee/platform-specification/services/EscrowServiceApis';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import LocalchainWithSync from '@ulixee/datastore/payments/LocalchainWithSync';
import IEscrowSpendTracker from '../interfaces/IEscrowSpendTracker';
export default class EscrowSpendTracker implements IEscrowSpendTracker {
    readonly escrowDbDir: string;
    readonly localchain: LocalchainWithSync;
    private readonly escrowDbsByDatastore;
    private readonly openEscrowsById;
    constructor(escrowDbDir: string, localchain: LocalchainWithSync);
    close(): Promise<void>;
    debit(data: IEscrowServiceApiTypes['EscrowService.debitPayment']['args']): Promise<IEscrowServiceApiTypes['EscrowService.debitPayment']['result']>;
    finalize(data: IEscrowServiceApiTypes['EscrowService.finalizePayment']['args']): Promise<IEscrowServiceApiTypes['EscrowService.finalizePayment']['result']>;
    importEscrow(data: IEscrowServiceApiTypes['EscrowService.importEscrow']['args'], datastoreManifest: IDatastoreManifest): Promise<IEscrowServiceApiTypes['EscrowService.importEscrow']['result']>;
    private updateSettlement;
    private timeForTick;
    private importToLocalchain;
    private canSign;
    private getDb;
}
