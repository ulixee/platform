import { IDatastoreApiTypes } from '@ulixee/specification/datastore';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';

export default new DatastoreApiHandler('Datastore.meta', {
  async handler(request, context) {
    const { computePricePerQuery } = context.configuration;

    const datastore = await context.datastoreRegistry.getByVersionHash(request.versionHash);

    let settlementFeeMicrogons: number;
    const functionsByName: IDatastoreApiTypes['Datastore.meta']['result']['functionsByName'] = {};
    const tablesByName: IDatastoreApiTypes['Datastore.meta']['result']['tablesByName'] = {};

    for (const [name, stats] of Object.entries(datastore.statsByFunction)) {
      const { prices } = datastore.functionsByName[name];
      let minimumPrice = 0;
      let pricePerQuery = 0;
      for (const price of prices) {
        minimumPrice += price.minimum;
        pricePerQuery += price.perQuery;
      }
      if (minimumPrice > 0) {
        settlementFeeMicrogons ??= (
          await context.sidechainClientManager.defaultClient.getSettings(false, false)
        ).settlementFeeMicrogons;
        minimumPrice += settlementFeeMicrogons;
      }

      functionsByName[name] = {
        stats: {
          averageMilliseconds: stats.averageMilliseconds,
          maxMilliseconds: stats.maxMilliseconds,
          averageTotalPricePerQuery: stats.averagePrice,
          maxPricePerQuery: stats.maxPrice,
          averageBytesPerQuery: stats.averageBytes,
          maxBytesPerQuery: stats.maxBytes,
        },
        pricePerQuery,
        minimumPrice,
        priceBreakdown: prices,
      };

      if (request.includeSchemasAsJson) {
        functionsByName[name].schemaJson = datastore.functionsByName[name]?.schemaAsJson;
      }
    }
    for (const [name, meta] of Object.entries(datastore.tablesByName)) {
      const { prices } = meta;
      let pricePerQuery = 0;
      for (const price of prices) {
        pricePerQuery += price.perQuery;
      }
      if (pricePerQuery > 0) {
        settlementFeeMicrogons ??= (
          await context.sidechainClientManager.defaultClient.getSettings(false, false)
        ).settlementFeeMicrogons;
        pricePerQuery += settlementFeeMicrogons;
      }

      tablesByName[name] = {
        pricePerQuery,
        priceBreakdown: prices,
      };

      if (request.includeSchemasAsJson) {
        tablesByName[name].schemaJson = meta.schemaAsJson;
      }
    }
    return {
      latestVersionHash: datastore.latestVersionHash,
      schemaInterface: datastore.schemaInterface,
      functionsByName,
      tablesByName,
      computePricePerQuery,
    };
  },
});
