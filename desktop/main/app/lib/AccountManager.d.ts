import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import IDatastoreHostLookup from '@ulixee/datastore/interfaces/IDatastoreHostLookup';
import ILocalUserProfile from '@ulixee/datastore/interfaces/ILocalUserProfile';
import { IDatabrokerAccount, IWallet } from '@ulixee/datastore/interfaces/IPaymentService';
import LocalUserProfile from '@ulixee/datastore/lib/LocalUserProfile';
import { IArgonFileMeta } from '@ulixee/desktop-interfaces/apis';
import { CryptoScheme, Localchain, LocalchainOverview } from '@ulixee/localchain';
import { IArgonFile } from './ArgonFile';
export default class AccountManager extends TypedEventEmitter<{
    update: {
        wallet: IWallet;
    };
}> {
    readonly localUserProfile: LocalUserProfile;
    exited: boolean;
    events: EventSubscriber;
    localchains: Localchain[];
    private localchainAddresses;
    private nextTick;
    private mainchainClient;
    private queue;
    constructor(localUserProfile: LocalUserProfile);
    loadMainchainClient(url?: string, timeoutMillis?: number): Promise<void>;
    start(): Promise<void>;
    close(): Promise<void>;
    addBrokerAccount(config: ILocalUserProfile['databrokers'][0]): Promise<IDatabrokerAccount>;
    getBrokerBalance(host: string, identity: string): Promise<bigint>;
    getBrokerAccounts(): Promise<IDatabrokerAccount[]>;
    addAccount(config?: {
        path?: string;
        password?: string;
        cryptoScheme?: CryptoScheme;
        suri?: string;
    }): Promise<Localchain>;
    getAddress(localchain: Localchain): Promise<string>;
    getLocalchain(address: String): Promise<Localchain>;
    getDatastoreHostLookup(): Promise<IDatastoreHostLookup | null>;
    getWallet(): Promise<IWallet>;
    transferMainchainToLocal(address: string, amount: bigint): Promise<void>;
    transferLocalToMainchain(address: string, amount: bigint): Promise<void>;
    createAccount(name: string, suri?: string, password?: string): Promise<LocalchainOverview>;
    createArgonsToSendFile(request: {
        milligons: bigint;
        fromAddress?: string;
        toAddress?: string;
    }): Promise<IArgonFileMeta>;
    createArgonsToRequestFile(request: {
        milligons: bigint;
        sendToMyAddress?: String;
    }): Promise<IArgonFileMeta>;
    acceptArgonRequest(argonFile: IArgonFile, fulfillFromAccount?: String): Promise<void>;
    importArgons(argonFile: IArgonFile): Promise<void>;
    private scheduleNextSync;
    private sync;
    private emitWallet;
}
