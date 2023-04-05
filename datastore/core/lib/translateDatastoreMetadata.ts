import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import PaymentProcessor from './PaymentProcessor';
import { IDatastoreManifestWithStats } from './DatastoreRegistry';
import IDatastoreApiContext from '../interfaces/IDatastoreApiContext';
import { IDatastoreStatsRecord } from '../db/DatastoreStatsTable';

export default async function translateDatastoreMetadata(
  datastore: IDatastoreManifestWithStats,
  context: IDatastoreApiContext,
  includeSchemaAsJson: boolean,
): Promise<IDatastoreApiTypes['Datastore.meta']['result']> {
  const result: IDatastoreApiTypes['Datastore.meta']['result'] = {
    name: datastore.name,
    description: datastore.description,
    isStarted: datastore.isStarted,
    scriptEntrypoint: datastore.scriptEntrypoint,
    versionHash: datastore.versionHash,
    latestVersionHash: datastore.latestVersionHash,
    schemaInterface: datastore.schemaInterface,
    stats: translateStats(datastore.stats),
    crawlersByName: {},
    runnersByName: {},
    tablesByName: {},
    computePricePerQuery: context.configuration.computePricePerQuery,
  };

  for (const [name, runner] of Object.entries(datastore.runnersByName)) {
    const { prices, schemaAsJson } = runner;
    const stats = datastore.statsByItemName[name];
    const { pricePerQuery, settlementFee } = await PaymentProcessor.getPrice(prices, context);

    result.runnersByName[name] = {
      description: result.description,
      stats: translateStats(stats),
      pricePerQuery,
      minimumPrice: pricePerQuery + settlementFee,
      priceBreakdown: prices,
      schemaJson: includeSchemaAsJson ? schemaAsJson : undefined,
    };
  }
  for (const [name, crawler] of Object.entries(datastore.crawlersByName)) {
    const { prices, schemaAsJson } = crawler;
    const stats = datastore.statsByItemName[name];
    const { pricePerQuery, settlementFee } = await PaymentProcessor.getPrice(prices, context);

    result.crawlersByName[name] = {
      description: result.description,
      stats: translateStats(stats),
      pricePerQuery,
      minimumPrice: pricePerQuery + settlementFee,
      priceBreakdown: prices,
      schemaJson: includeSchemaAsJson ? schemaAsJson : undefined,
    };
  }

  for (const [name, meta] of Object.entries(datastore.tablesByName)) {
    const { prices } = meta;
    const { pricePerQuery, settlementFee } = await PaymentProcessor.getPrice(prices, context);
    const stats = datastore.statsByItemName[name];

    result.tablesByName[name] = {
      description: result.description,
      stats: translateStats(stats),
      pricePerQuery: pricePerQuery + settlementFee,
      priceBreakdown: prices,
      schemaJson: includeSchemaAsJson ? meta.schemaAsJson : undefined,
    };
  }
  return result;
}

export function translateStats(
  stats: IDatastoreStatsRecord,
): IDatastoreApiTypes['Datastore.meta']['result']['runnersByName'][0]['stats'] {
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
