import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { IPayment } from '@ulixee/platform-specification';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import { IPaymentMethod } from '@ulixee/platform-specification/types/IPayment';
import IDatastoreHostLookup from '../interfaces/IDatastoreHostLookup';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';
import IPaymentService, { ICredit, IWallet } from '../interfaces/IPaymentService';
import CreditPaymentService from './CreditPaymentService';
import LocalchainPaymentService from './LocalchainPaymentService';
export interface IPaymentEvents {
    reserved: {
        datastoreId: string;
        payment: IPayment;
        remainingBalance: number;
    };
    finalized: {
        paymentUuid: string;
        initialMicrogons: number;
        finalMicrogons: number;
        remainingBalance: number;
    };
    createdEscrow: {
        escrowId: string;
        datastoreId: string;
        allocatedMilligons: bigint;
    };
    updateSettlement: {
        escrowId: string;
        settledMilligons: bigint;
        remaining: bigint;
        datastoreId: string;
    };
}
/**
 * A LocalPaymentService combines credits with a localchain payment service.
 */
export default class LocalPaymentService extends TypedEventEmitter<IPaymentEvents> implements IPaymentService {
    readonly creditsByDatastoreId: {
        [datastoreId: string]: CreditPaymentService[];
    };
    localchainPaymentService?: LocalchainPaymentService;
    private readonly paymentUuidToService;
    private creditsAutoLoaded;
    private creditsPath;
    constructor(localchainPaymentService?: LocalchainPaymentService, loadCreditFromPath?: string | 'default');
    getWallet(): Promise<IWallet>;
    credits(): Promise<ICredit[]>;
    loadCredits(path?: string): Promise<void>;
    getDatastoreHostLookup(): Promise<IDatastoreHostLookup | null>;
    addCredit(service: CreditPaymentService): void;
    close(): Promise<void>;
    attachCredit(url: string, credit: IPaymentMethod['credits'], datastoreLookup?: IDatastoreHostLookup): Promise<void>;
    whitelistRemotes(manifest: IDatastoreMetadata, datastoreLookup: IDatastoreHostLookup): Promise<void>;
    reserve(info: IPaymentServiceApiTypes['PaymentService.reserve']['args']): Promise<IPayment>;
    finalize(info: IPaymentServiceApiTypes['PaymentService.finalize']['args']): Promise<void>;
}
