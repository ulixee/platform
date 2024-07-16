/// <reference types="node" />
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import IBalanceChange from '@ulixee/platform-specification/types/IBalanceChange';
import Identity from '@ulixee/platform-utils/lib/Identity';
import { IEscrowDetails, IEscrowSource } from './ArgonReserver';
export default class BrokerEscrowSource implements IEscrowSource {
    host: string;
    readonly authentication: Identity;
    get sourceKey(): string;
    private readonly connectionToCore;
    private keyring;
    private loadPromise;
    constructor(host: string, authentication: Identity);
    close(): Promise<void>;
    load(): Promise<void>;
    getBalance(): Promise<bigint>;
    createEscrow(paymentInfo: IPaymentServiceApiTypes['PaymentService.reserve']['args'], milligons: bigint): Promise<IEscrowDetails>;
    updateEscrowSettlement(escrow: IEscrowDetails, updatedSettlement: bigint): Promise<IBalanceChange>;
    static createSignatureMessage(domain: string | null, datastoreId: string, identity: Buffer, milligons: bigint, nonce: string): Buffer;
    static getBalance(host: string, identity: string): Promise<bigint>;
}
