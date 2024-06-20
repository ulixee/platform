import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import DatastoreApiClients from '@ulixee/datastore/lib/DatastoreApiClients';
import DatastoreLookup from '@ulixee/datastore/lib/DatastoreLookup';
import LocalchainPaymentService, { IPaymentConfig } from '@ulixee/datastore/payments/LocalchainPaymentService';
import { BalanceSyncResult, DataDomainStore, KeystorePasswordOption, OpenEscrowsStore } from '@ulixee/localchain';
export default class LocalchainWithSync extends TypedEventEmitter<{
    sync: BalanceSyncResult;
}> {
    #private;
    readonly localchainConfig?: ILocalchainConfig;
    get dataDomains(): DataDomainStore;
    get openEscrows(): OpenEscrowsStore;
    datastoreLookup: DatastoreLookup;
    address: Promise<string>;
    enableLogging: boolean;
    private nextTick;
    constructor(localchainConfig?: ILocalchainConfig);
    load(): Promise<void>;
    timeForTick(tick: number): Date;
    createPaymentService(datastoreClients: DatastoreApiClients): LocalchainPaymentService;
    private scheduleNextTick;
}
export interface ILocalchainConfig {
    mainchainUrl: string;
    notaryId: number;
    localchainPath: string;
    /**
     * Strategy to use to create upstream escrows. Defaults to a 100 query multiplier
     */
    upstreamEscrowMilligonsStrategy?: IPaymentConfig['escrowMilligonsStrategy'];
    /**
     * Must be set to enable vote creation
     */
    votesAddress?: string;
    /**
     * A password, if applicable, to the localchain
     */
    keystorePassword: KeystorePasswordOption;
}
