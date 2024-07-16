import { KeyringPair } from '@polkadot/keyring/types';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import IPaymentService, { IPaymentEvents } from '@ulixee/datastore/interfaces/IPaymentService';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { IPayment } from '@ulixee/platform-specification';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
export default class MockPaymentService extends TypedEventEmitter<IPaymentEvents> implements IPaymentService {
    clientAddress: KeyringPair;
    client: DatastoreApiClient;
    paymentsByDatastoreId: {
        [datastoreId: string]: {
            escrowId: string;
        };
    };
    escrowsById: {
        [escrowId: string]: {
            escrowHoldAmount: bigint;
            tick: number;
        };
    };
    payments: IPaymentServiceApiTypes['PaymentService.finalize']['args'][];
    constructor(clientAddress: KeyringPair, client: DatastoreApiClient);
    close(): Promise<void>;
    reserve(info: IPaymentServiceApiTypes['PaymentService.reserve']['args']): Promise<IPayment>;
    finalize(info: any): Promise<void>;
}
