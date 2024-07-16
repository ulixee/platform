import { LocalchainOverview } from '@ulixee/localchain';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import IBalanceChange from '@ulixee/platform-specification/types/IBalanceChange';
import { IEscrowDetails, IEscrowSource } from './ArgonReserver';
import LocalchainWithSync from './LocalchainWithSync';
export default class LocalchainEscrowSource implements IEscrowSource {
    localchain: LocalchainWithSync;
    address: string;
    get sourceKey(): string;
    private readonly openEscrowsById;
    constructor(localchain: LocalchainWithSync, address: string);
    getAccountOverview(): Promise<LocalchainOverview>;
    createEscrow(paymentInfo: IPaymentServiceApiTypes['PaymentService.reserve']['args'], milligons: bigint): Promise<IEscrowDetails>;
    updateEscrowSettlement(escrow: IEscrowDetails, updatedSettlement: bigint): Promise<IBalanceChange>;
}
