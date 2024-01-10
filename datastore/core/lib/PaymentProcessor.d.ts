import { IPayment } from '@ulixee/platform-specification';
import Datastore from '@ulixee/datastore';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import IDatastoreApiContext from '../interfaces/IDatastoreApiContext';
/**
 * 50 microgons for 1KB means:
 * 1 microgons per 20.5 bytes
 * 1MB is $0.05
 * 1GB is $52.43
 *
 * Luminati is 1.2c per mb base price (but that's for all page contents)
 *  ie, 12k microgons, ie, 12 microgons per kb
 *
 */
export default class PaymentProcessor {
    private payment;
    private datastore;
    readonly context: Pick<IDatastoreApiContext, 'configuration' | 'sidechainClientManager'>;
    private static settlementFeeMicrogons;
    private microgonsToHold;
    private holdId;
    private holdAuthorizationCode?;
    private fundingBalance;
    private sidechain;
    private sidechainSettings;
    private readonly functionHolds;
    private readonly payouts;
    constructor(payment: IPayment, datastore: Datastore, context: Pick<IDatastoreApiContext, 'configuration' | 'sidechainClientManager'>);
    createHold(manifest: IDatastoreManifest, functionCallsWithTempIds: {
        id: number;
        name: string;
    }[], pricingPreferences?: {
        maxComputePricePerQuery?: number;
    }): Promise<boolean>;
    releaseLocalFunctionHold(functionId: number, resultBytes: number): number;
    settle(finalResultBytes: number): Promise<number>;
    private canUseMicronote;
    private holdMicronoteMinimum;
    private loadSidechain;
    static getPrice(prices: {
        perQuery?: number;
        minimum?: number;
    }[], context: Pick<IDatastoreApiContext, 'configuration' | 'sidechainClientManager'>): Promise<{
        pricePerQuery: number;
        settlementFee: number;
    }>;
    static getOfficialBytes(output: any): number;
}
