import { IDatastoreApiTypes } from '@ulixee/specification/datastore';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import DatastoreCore from '../index';

export default new DatastoreApiHandler('Datastore.meta', {
  async handler(request, context) {
    await DatastoreCore.start();

    const { giftCardsRequiredIssuerIdentity, giftCardsAllowed, computePricePerQuery } =
      context.configuration;

    const datastore = context.datastoreRegistry.getByVersionHash(request.versionHash);
    const giftCardIssuerIdentities: string[] = [];
    if ((giftCardsRequiredIssuerIdentity || giftCardsAllowed) && datastore.giftCardIssuerIdentity) {
      giftCardIssuerIdentities.push(datastore.giftCardIssuerIdentity);
      if (
        giftCardsRequiredIssuerIdentity &&
        giftCardsRequiredIssuerIdentity !== datastore.giftCardIssuerIdentity
      ) {
        giftCardIssuerIdentities.push(giftCardsRequiredIssuerIdentity);
      }
    }

    let settlementFeeMicrogons: number;
    const functionsByName: IDatastoreApiTypes['Datastore.meta']['result']['functionsByName'] = {};

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

    return {
      latestVersionHash: datastore.latestVersionHash,
      giftCardIssuerIdentities,
      schemaInterface: datastore.schemaInterface,
      functionsByName,
      computePricePerQuery,
    };
  },
});
