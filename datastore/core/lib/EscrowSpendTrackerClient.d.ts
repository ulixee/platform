import { ConnectionToCore } from '@ulixee/net';
import IEscrowServiceApiTypes, { IEscrowServiceApis } from '@ulixee/platform-specification/services/EscrowServiceApis';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import IEscrowSpendTracker from '../interfaces/IEscrowSpendTracker';
export default class EscrowSpendTrackerClient implements IEscrowSpendTracker {
    readonly serviceClient: ConnectionToCore<IEscrowServiceApis, {}>;
    constructor(serviceClient: ConnectionToCore<IEscrowServiceApis, {}>);
    debit(data: IEscrowServiceApiTypes['EscrowService.debitPayment']['args']): Promise<IEscrowServiceApiTypes['EscrowService.debitPayment']['result']>;
    finalize(data: IEscrowServiceApiTypes['EscrowService.finalizePayment']['args']): Promise<IEscrowServiceApiTypes['EscrowService.finalizePayment']['result']>;
    importEscrow(data: IEscrowServiceApiTypes['EscrowService.importEscrow']['args'], _datastoreManifest: IDatastoreManifest): Promise<IEscrowServiceApiTypes['EscrowService.importEscrow']['result']>;
}
