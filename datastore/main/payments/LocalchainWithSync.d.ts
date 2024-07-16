import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { BalanceSync, BalanceSyncResult, DataDomainStore, Localchain, LocalchainOverview, MainchainTransferStore, OpenEscrowsStore, Transactions } from '@ulixee/localchain';
import ILocalchainConfig from '../interfaces/ILocalchainConfig';
import DatastoreApiClients from '../lib/DatastoreApiClients';
import DatastoreLookup from '../lib/DatastoreLookup';
import DefaultPaymentService from './DefaultPaymentService';
export default class LocalchainWithSync extends TypedEventEmitter<{
    sync: BalanceSyncResult;
}> {
    #private;
    readonly localchainConfig: ILocalchainConfig;
    get dataDomains(): DataDomainStore;
    get openEscrows(): OpenEscrowsStore;
    get balanceSync(): BalanceSync;
    get transactions(): Transactions;
    get mainchainTransfers(): MainchainTransferStore;
    get inner(): Localchain;
    datastoreLookup: DatastoreLookup;
    address: Promise<string>;
    enableLogging: boolean;
    private nextTick;
    constructor(localchainConfig?: ILocalchainConfig);
    load(): Promise<void>;
    close(): Promise<void>;
    connectToMainchain(mainchainUrl: string, timeoutMs?: number): Promise<void>;
    getAccountOverview(): Promise<LocalchainOverview>;
    timeForTick(tick: number): Date;
    createPaymentService(datastoreClients: DatastoreApiClients): Promise<DefaultPaymentService>;
    private getPassword;
    private afterLoad;
    private scheduleNextTick;
    static load(config?: ILocalchainConfig): Promise<LocalchainWithSync>;
}
