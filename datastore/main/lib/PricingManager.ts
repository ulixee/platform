import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import IDatastorePricing from '@ulixee/platform-specification/types/IDatastorePricing';
import { SqlParser } from '@ulixee/sql-engine';
import DatastoreApiClient from './DatastoreApiClient';

export default class PricingManager {
  constructor(readonly apiClient: DatastoreApiClient) {}

  public async getEntityPrice(datastoreId: string, version: string, name: string): Promise<number> {
    const manifest = await this.apiClient.getMeta(datastoreId, version);
    const details =
      manifest.crawlersByName[name] ??
      manifest.extractorsByName[name] ??
      manifest.tablesByName[name];
    return details?.netBasePrice;
  }

  public async getQueryPrice(datastoreId: string, version: string, sql: string): Promise<number> {
    const manifest = await this.apiClient.getMeta(datastoreId, version);
    const sqlParser = new SqlParser(sql);
    const entities = sqlParser.extractCalls();
    let price = 0;
    for (const call of entities) {
      const details =
        manifest.crawlersByName[call] ??
        manifest.extractorsByName[call] ??
        manifest.tablesByName[call];
      price += details?.netBasePrice ?? 0;
    }
    return price;
  }

  public static computePrice(manifest: IDatastoreManifest, entityCalls: string[]): number {
    let price = 0;

    for (const call of entityCalls) {
      const entity =
        manifest.extractorsByName[call] ??
        manifest.crawlersByName[call] ??
        manifest.tablesByName[call];
      if (entity?.prices) {
        price += PricingManager.getNetBasePrice(entity.prices);
      }
    }
    return price;
  }

  public static getNetBasePrice(prices: IDatastorePricing[]): number {
    let basePrice = 0;
    for (const price of prices) {
      if (Number.isInteger(price.basePrice)) basePrice += price.basePrice;
    }
    return basePrice;
  }

  public static getOfficialBytes(output: any): number {
    if (output === undefined || output === null) return 0;
    // must use types or you can't serialize Bigint/Regex/etc
    return Buffer.byteLength(Buffer.from(TypeSerializer.stringify(output), 'utf8'));
  }
}
