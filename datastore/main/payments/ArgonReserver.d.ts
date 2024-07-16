import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { IPayment } from '@ulixee/platform-specification';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import IBalanceChange from '@ulixee/platform-specification/types/IBalanceChange';
import IDatastoreHostLookup from '../interfaces/IDatastoreHostLookup';
import { IPaymentDetails, IPaymentEvents, IPaymentReserver } from '../interfaces/IPaymentService';
import DatastoreApiClients from '../lib/DatastoreApiClients';
export type IEscrowAllocationStrategy = {
    type: 'default';
    milligons: bigint;
} | {
    type: 'multiplier';
    queries: number;
};
type IPaymentDetailsByDatastoreId = {
    [datastoreId: string]: IPaymentDetails[];
};
export interface IEscrowDetails {
    escrowId: string;
    balanceChange: IBalanceChange;
    expirationDate: Date;
}
export interface IEscrowSource {
    sourceKey: string;
    datastoreLookup?: IDatastoreHostLookup;
    createEscrow(paymentInfo: IPaymentServiceApiTypes['PaymentService.reserve']['args'], milligons: bigint): Promise<IEscrowDetails>;
    updateEscrowSettlement(escrow: IEscrowDetails, updatedSettlement: bigint): Promise<IBalanceChange>;
}
export default class ArgonReserver extends TypedEventEmitter<IPaymentEvents> implements IPaymentReserver {
    private escrowSource;
    private escrowAllocationStrategy;
    static baseStorePath: string;
    readonly paymentsByDatastoreId: IPaymentDetailsByDatastoreId;
    datastoreLookup?: IDatastoreHostLookup;
    private paymentsPendingFinalization;
    private readonly openEscrowsById;
    private readonly reserveQueueByDatastoreId;
    private readonly escrowQueue;
    private needsSave;
    private loadPromise;
    private readonly saveInterval;
    private closeApiClients;
    private apiClients;
    private readonly storePath;
    constructor(escrowSource: IEscrowSource, escrowAllocationStrategy?: IEscrowAllocationStrategy, apiClients?: DatastoreApiClients);
    close(): Promise<void>;
    load(): Promise<void>;
    save(): Promise<void>;
    getEscrowDetails(escrowId: string): IEscrowDetails;
    reserve(paymentInfo: IPaymentServiceApiTypes['PaymentService.reserve']['args']): Promise<IPayment>;
    finalize(paymentInfo: IPaymentServiceApiTypes['PaymentService.finalize']['args']): Promise<void>;
    createEscrow(paymentInfo: IPaymentServiceApiTypes['PaymentService.reserve']['args'], milligons: bigint): Promise<IPaymentDetails>;
    protected calculateEscrowMilligons(_datastoreId: string, microgons: number): bigint;
    private charge;
    private updateSettlement;
    private writeToDisk;
}
export {};
