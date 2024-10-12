import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import IDatastorePricing from '@ulixee/platform-specification/types/IDatastorePricing';
import DatastoreApiClient from './DatastoreApiClient';
export default class PricingManager {
    readonly apiClient: DatastoreApiClient;
    constructor(apiClient: DatastoreApiClient);
    getEntityPrice(datastoreId: string, version: string, name: string): Promise<number>;
    getQueryPrice(datastoreId: string, version: string, sql: string): Promise<number>;
    static computePrice(manifest: IDatastoreManifest, entityCalls: string[]): number;
    static getNetBasePrice(prices: IDatastorePricing[]): number;
    static getOfficialBytes(output: any): number;
}
