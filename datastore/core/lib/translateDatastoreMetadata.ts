import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import PaymentProcessor from './PaymentProcessor';
import IDatastoreApiContext from '../interfaces/IDatastoreApiContext';
import { IDatastoreStatsRecord } from '../db/DatastoreStatsTable';
import { IDatastoreStats } from './StatsTracker';
import { IDatastoreManifestWithLatest } from '../interfaces/IDatastoreRegistryStore';

export default async function translateDatastoreMetadata(
  datastore: IDatastoreManifestWithLatest,
  datastoreStats: IDatastoreStats,
  context: IDatastoreApiContext,
  includeSchemaAsJson: boolean,
): Promise<IDatastoreApiTypes['Datastore.meta']['result']> {
  const result: IDatastoreApiTypes['Datastore.meta']['result'] = {
    ...datastore,
    stats: datastoreStats.stats,
    crawlersByName: {},
    extractorsByName: {},
    tablesByName: {},
    computePricePerQuery: context.configuration.computePricePerQuery,
  };

  for (const [name, extractor] of Object.entries(datastore.extractorsByName)) {
    const { prices, schemaAsJson } = extractor;
    const { stats } = datastoreStats.statsByEntityName[name];
    const { pricePerQuery, settlementFee } = await PaymentProcessor.getPrice(prices, context);

    result.extractorsByName[name] = {
      description: extractor.description,
      stats,
      pricePerQuery,
      minimumPrice: pricePerQuery + settlementFee,
      prices,
      schemaAsJson: includeSchemaAsJson ? schemaAsJson : undefined,
    };
  }
  for (const [name, crawler] of Object.entries(datastore.crawlersByName)) {
    const { prices, schemaAsJson } = crawler;
    const { stats } = datastoreStats.statsByEntityName[name];
    const { pricePerQuery, settlementFee } = await PaymentProcessor.getPrice(prices, context);

    result.crawlersByName[name] = {
      description: crawler.description,
      stats,
      pricePerQuery,
      minimumPrice: pricePerQuery + settlementFee,
      prices,
      schemaAsJson: includeSchemaAsJson ? schemaAsJson : undefined,
    };
  }

  for (const [name, meta] of Object.entries(datastore.tablesByName)) {
    const { prices } = meta;
    const { pricePerQuery, settlementFee } = await PaymentProcessor.getPrice(prices, context);
    const { stats } = datastoreStats.statsByEntityName[name];

    result.tablesByName[name] = {
      description: meta.description,
      stats,
      pricePerQuery: pricePerQuery + settlementFee,
      prices,
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
