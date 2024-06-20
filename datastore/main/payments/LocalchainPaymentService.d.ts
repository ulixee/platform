import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { DataTLD, KeystorePasswordOption, Localchain } from '@ulixee/localchain';
import { IPayment } from '@ulixee/platform-specification';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import IDatastoreHostLookup from '../interfaces/IDatastoreHostLookup';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';
import IPaymentService, { IPaymentDetails, IWallet } from '../interfaces/IPaymentService';
import DatastoreApiClients from '../lib/DatastoreApiClients';
import { IPaymentEvents } from './LocalPaymentService';
export { DataTLD };
export interface IPaymentConfig {
    escrowMilligonsStrategy: {
        type: 'default';
        milligons: bigint;
    } | {
        type: 'multiplier';
        queries: number;
    };
}
type IPaymentDetailsByDatastoreId = {
    [datastoreId: string]: IPaymentDetails[];
};
/**
 * Singleton that will track payments for each escrow for a datastore
 */
export default class LocalchainPaymentService extends TypedEventEmitter<IPaymentEvents> implements IPaymentService {
    localchain: Localchain;
    private config;
    apiClients: DatastoreApiClients | null;
    static storePath: string;
    readonly paymentsByDatastoreId: IPaymentDetailsByDatastoreId;
    /**
     * Security feature to enable only specific datastores to create escrows.
     */
    private datastoreIdsAllowedToCreateEscrows;
    /**
     * Indicates which datastores have been loaded into the IPaymentService['whitelistRemotes'] call
     */
    private loadedDatastoreMetadataIds;
    private paymentsPendingFinalization;
    private readonly openEscrowsById;
    private readonly reserveQueueByDatastoreId;
    private readonly escrowQueue;
    private needsSave;
    private needsApiClientsClose;
    private loadPromise;
    private saveInterval;
    private syncTimeout;
    constructor(localchain: Localchain, config: IPaymentConfig, apiClients: DatastoreApiClients | null);
    close(): Promise<void>;
    sync(): void;
    getWallet(): Promise<IWallet>;
    connectToMainchain(mainchainUrl: string, timeoutMs?: number): Promise<void>;
    load(): Promise<void>;
    save(): Promise<void>;
    reserve(paymentInfo: IPaymentServiceApiTypes['PaymentService.reserve']['args']): Promise<IPayment>;
    finalize(paymentInfo: IPaymentServiceApiTypes['PaymentService.finalize']['args']): Promise<void>;
    createEscrow(paymentInfo: IPaymentServiceApiTypes['PaymentService.reserve']['args'], milligons: bigint): Promise<IPaymentDetails>;
    whitelistRemotes(datastoreMetadata: IDatastoreMetadata, datastoreLookup: IDatastoreHostLookup): Promise<void>;
    protected calculateEscrowMilligons(_datastoreId: string, microgons: number): bigint;
    private charge;
    private updateSettlement;
    private writeToDisk;
    static loadOfflineLocalchain(config?: {
        localchainPath?: string;
        keystorePassword?: KeystorePasswordOption;
    }): Promise<Localchain>;
    static load(config?: Partial<IPaymentConfig> & {
        localchainPath?: string;
        mainchainUrl?: string;
        keystorePassword?: KeystorePasswordOption;
        apiClients?: DatastoreApiClients;
    }): Promise<LocalchainPaymentService>;
}
