import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { IPayment } from '@ulixee/platform-specification';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import { IPaymentMethod } from '@ulixee/platform-specification/types/IPayment';
import IDatastoreHostLookup from '../interfaces/IDatastoreHostLookup';
import IPaymentService, { ICredit, IPaymentEvents, IPaymentReserver } from '../interfaces/IPaymentService';
import DatastoreApiClients from '../lib/DatastoreApiClients';
import { IEscrowAllocationStrategy } from './ArgonReserver';
import CreditReserver from './CreditReserver';
import LocalchainWithSync from './LocalchainWithSync';
/**
 * A PaymentService that activates credits and includes an optional ArgonReserver
 */
export default class DefaultPaymentService extends TypedEventEmitter<IPaymentEvents> implements IPaymentService {
    #private;
    readonly creditsByDatastoreId: {
        [datastoreId: string]: CreditReserver[];
    };
    readonly creditsPath: string;
    private readonly argonReserver?;
    private readonly paymentUuidToService;
    private readonly creditsAutoLoaded;
    constructor(argonReserver?: IPaymentReserver, loadCreditFromPath?: string | 'default');
    credits(): Promise<ICredit[]>;
    loadCredits(path?: string): Promise<void>;
    addCredit(service: CreditReserver): void;
    close(): Promise<void>;
    attachCredit(url: string, credit: IPaymentMethod['credits'], datastoreLookup?: IDatastoreHostLookup): Promise<void>;
    reserve(info: IPaymentServiceApiTypes['PaymentService.reserve']['args']): Promise<IPayment>;
    finalize(info: IPaymentServiceApiTypes['PaymentService.finalize']['args']): Promise<void>;
    static fromLocalchain(localchain: LocalchainWithSync, escrowAllocationStrategy?: IEscrowAllocationStrategy, apiClients?: DatastoreApiClients, loadCreditsFromPath?: string | 'default'): Promise<DefaultPaymentService>;
    static fromBroker(brokerHost: string, identityConfig: {
        pemPath: string;
        passphrase?: string;
    }, escrowAllocationStrategy?: IEscrowAllocationStrategy, apiClients?: DatastoreApiClients, loadCreditsFromPath?: string | 'default'): Promise<DefaultPaymentService>;
}
