import PricingManager from '@ulixee/datastore/lib/PricingManager';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import { IDatastorePaymentRecipient } from '@ulixee/platform-specification/types/IDatastoreManifest';
import { IDatastoreStatsRecord } from '../db/DatastoreStatsTable';
import { IDatastoreManifestWithLatest } from '../interfaces/IDatastoreRegistryStore';
import { IDatastoreStats } from './StatsTracker';

export default async function translateDatastoreMetadata(
  datastore: IDatastoreManifestWithLatest,
  datastoreStats: IDatastoreStats,
  includeSchemaAsJson: boolean,
  paymentInfo?: IDatastorePaymentRecipient,
): Promise<IDatastoreApiTypes['Datastore.meta']['result']> {
  const result: IDatastoreApiTypes['Datastore.meta']['result'] = {
    ...datastore,
    stats: datastoreStats.stats,
    crawlersByName: {},
    extractorsByName: {},
    tablesByName: {},
    payment: paymentInfo,
  };

  for (const [name, extractor] of Object.entries(datastore.extractorsByName)) {
    const { prices, schemaAsJson } = extractor;
    const { stats } = datastoreStats.statsByEntityName[name];
    const netBasePrice = PricingManager.getNetBasePrice(prices);

    result.extractorsByName[name] = {
      description: extractor.description,
      stats,
      netBasePrice,
      priceBreakdown: prices,
      schemaAsJson: includeSchemaAsJson ? schemaAsJson : undefined,
    };
  }
  for (const [name, crawler] of Object.entries(datastore.crawlersByName)) {
    const { prices, schemaAsJson } = crawler;
    const { stats } = datastoreStats.statsByEntityName[name];
    const netBasePrice = PricingManager.getNetBasePrice(prices);

    result.crawlersByName[name] = {
      description: crawler.description,
      stats,
      netBasePrice,
      priceBreakdown: prices,
      schemaAsJson: includeSchemaAsJson ? schemaAsJson : undefined,
    };
  }

  for (const [name, meta] of Object.entries(datastore.tablesByName)) {
    const { prices } = meta;
    const { stats } = datastoreStats.statsByEntityName[name];
    const netBasePrice = PricingManager.getNetBasePrice(prices);

    result.tablesByName[name] = {
      description: meta.description,
      stats,
      netBasePrice,
      priceBreakdown: prices,
      schemaAsJson: includeSchemaAsJson ? meta.schemaAsJson : undefined,
    };
  }
  return result;
}

export function translateStats(
  stats: IDatastoreStatsRecord,
): IDatastoreApiTypes['Datastore.meta']['result']['extractorsByName'][0]['stats'] {
  stats ??= {} as any;
  return {
    queries: stats.runs ?? 0,
    errors: stats.errors ?? 0,
    totalSpend: stats.totalSpend ?? 0,
    totalCreditSpend: stats.totalCreditSpend ?? 0,
    averageMilliseconds: stats.averageMilliseconds ?? 0,
    maxMilliseconds: stats.maxMilliseconds ?? 0,
    averageTotalPricePerQuery: stats.averagePrice ?? 0,
    maxPricePerQuery: stats.maxPrice ?? 0,
    averageBytesPerQuery: stats.averageBytes ?? 0,
    maxBytesPerQuery: stats.maxBytes ?? 0,
  };
}
