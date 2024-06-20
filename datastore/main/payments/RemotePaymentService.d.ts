/// <reference types="node" />
import { ConnectionToCore } from '@ulixee/net';
import { IPayment } from '@ulixee/platform-specification';
import { IPaymentServiceApis } from '@ulixee/platform-specification/datastore';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import { IPaymentMethod } from '@ulixee/platform-specification/types/IPayment';
import Identity from '@ulixee/platform-utils/lib/Identity';
import IDatastoreHostLookup from '../interfaces/IDatastoreHostLookup';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';
import IPaymentService from '../interfaces/IPaymentService';
export default class RemotePaymentService implements IPaymentService {
    readonly connectionToCore: ConnectionToCore<IPaymentServiceApis, {}>;
    /**
     * This stores credits that are controlled on the local machine. It should not be used in a shared environment like a CloudNode.
     */
    private localCreditsByDatastoreId;
    private authenticationToken;
    private whitelistedDatastoreIds;
    private loadedDatastoreIds;
    private readonly creditPaymentUuidToDatastoreId;
    constructor(connectionToCore: ConnectionToCore<IPaymentServiceApis, {}>);
    loadLocalCredits(): Promise<void>;
    attachCredit(datastoreUrl: string, credit: IPaymentMethod['credits'], datastoreLookup?: IDatastoreHostLookup): Promise<void>;
    whitelistRemotes(datastoreMetadata: IDatastoreMetadata, datastoreLookup: IDatastoreHostLookup): Promise<void>;
    authenticate(identity: Identity): Promise<void>;
    reserve(info: IPaymentServiceApiTypes['PaymentService.reserve']['args']): Promise<IPayment>;
    finalize(info: IPaymentServiceApiTypes['PaymentService.finalize']['args']): Promise<void>;
    static getMessage(identity: string, nonce: string): Buffer;
}
