import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import { IDatastoreStatsRecord } from '../db/DatastoreStatsTable';
import PaymentProcessor from './PaymentProcessor';
import { IDatastoreManifestWithStats } from './DatastoreRegistry';
import IDatastoreApiContext from '../interfaces/IDatastoreApiContext';

export default async function translateDatastoreMetadata(
  datastore: IDatastoreManifestWithStats,
  context: IDatastoreApiContext,
  includeSchemaAsJson: boolean,
): Promise<IDatastoreApiTypes['Datastore.meta']['result']> {
  const result: IDatastoreApiTypes['Datastore.meta']['result'] = {
    name: datastore.name,
    versionHash: datastore.versionHash,
    latestVersionHash: datastore.latestVersionHash,
    schemaInterface: datastore.schemaInterface,
    crawlersByName: {},
    runnersByName: {},
    tablesByName: {},
    computePricePerQuery: context.configuration.computePricePerQuery,
  };

  for (const [name, runner] of Object.entries(datastore.runnersByName)) {
    const { prices, schemaAsJson } = runner;
    const stats = datastore.statsByName[name];
    const { pricePerQuery, settlementFee } = await PaymentProcessor.getPrice(prices, context);

    result.runnersByName[name] = {
      stats: translateStats(stats),
      pricePerQuery,
      minimumPrice: pricePerQuery + settlementFee,
      priceBreakdown: prices,
      schemaJson: includeSchemaAsJson ? schemaAsJson : undefined,
    };
  }
  for (const [name, crawler] of Object.entries(datastore.crawlersByName)) {
    const { prices, schemaAsJson } = crawler;
    const stats = datastore.statsByName[name];
    const { pricePerQuery, settlementFee } = await PaymentProcessor.getPrice(prices, context);

    result.crawlersByName[name] = {
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
    const stats = datastore.statsByName[name];

    result.tablesByName[name] = {
      stats: translateStats(stats),
      pricePerQuery: pricePerQuery + settlementFee,
      priceBreakdown: prices,
      schemaJson: includeSchemaAsJson ? meta.schemaAsJson : undefined,
    };
  }
  return result;
}

function translateStats(
  stats: IDatastoreStatsRecord,
): IDatastoreApiTypes['Datastore.meta']['result']['runnersByName'][0]['stats'] {
  stats ??= {} as any;
  return {
    averageMilliseconds: stats.averageMilliseconds ?? 0,
    maxMilliseconds: stats.maxMilliseconds ?? 0,
    averageTotalPricePerQuery: stats.averagePrice ?? 0,
    maxPricePerQuery: stats.maxPrice ?? 0,
    averageBytesPerQuery: stats.averageBytes ?? 0,
    maxBytesPerQuery: stats.maxBytes ?? 0,
  };
}
