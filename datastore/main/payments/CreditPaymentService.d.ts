import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { IPayment } from '@ulixee/platform-specification';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import { IPaymentMethod } from '@ulixee/platform-specification/types/IPayment';
import IDatastoreHostLookup from '../interfaces/IDatastoreHostLookup';
import IPaymentService, { ICredit, IPaymentDetails } from '../interfaces/IPaymentService';
import { IPaymentEvents } from './LocalPaymentService';
export default class CreditPaymentService extends TypedEventEmitter<Pick<IPaymentEvents, 'reserved' | 'finalized'>> implements IPaymentService {
    private baseDir;
    static MIN_BALANCE: number;
    static defaultBasePath: string;
    get datastoreId(): string;
    get credit(): ICredit;
    paymentDetails: IPaymentDetails;
    storePath: string;
    private isClosed;
    private readonly saveDebounce;
    private queue;
    private paymentsPendingFinalization;
    constructor(credit: IPaymentDetails, baseDir: string);
    hasBalance(microgons: number): boolean;
    reserve(paymentInfo: IPaymentServiceApiTypes['PaymentService.reserve']['args']): Promise<IPayment>;
    canFinalize(uuid: string): boolean;
    finalize(paymentInfo: IPaymentServiceApiTypes['PaymentService.finalize']['args']): Promise<void>;
    close(): Promise<void>;
    save(canDelete?: boolean): Promise<void>;
    private writeToDisk;
    static loadAll(fromDir?: string): Promise<CreditPaymentService[]>;
    static load(datastoreId: string, creditId: string, fromDir?: string): Promise<CreditPaymentService>;
    static storeCredit(datastoreId: string, datastoreVersion: string, host: string, credits: {
        id: string;
        secret: string;
        remainingCredits: number;
    }, creditsDir?: string): Promise<CreditPaymentService>;
    static lookup(datastoreUrl: string, credit: IPaymentMethod['credits'], datastoreLookup?: IDatastoreHostLookup, creditsDir?: string): Promise<CreditPaymentService>;
    static storeCreditFromUrl(url: string, microgons: number, datastoreLookup?: IDatastoreHostLookup): Promise<CreditPaymentService>;
}
