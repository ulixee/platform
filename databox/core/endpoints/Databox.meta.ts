import { IDataboxApiTypes } from '@ulixee/specification/databox';
import DataboxApiHandler from '../lib/DataboxApiHandler';
import DataboxCore from '../index';

export default new DataboxApiHandler('Databox.meta', {
  async handler(request, context) {
    await DataboxCore.start();

    const { giftCardsRequiredIssuerIdentity, giftCardsAllowed, computePricePerQuery } =
      context.configuration;

    const databox = context.databoxRegistry.getByVersionHash(request.versionHash);
    const giftCardIssuerIdentities: string[] = [];
    if ((giftCardsRequiredIssuerIdentity || giftCardsAllowed) && databox.giftCardIssuerIdentity) {
      giftCardIssuerIdentities.push(databox.giftCardIssuerIdentity);
      if (
        giftCardsRequiredIssuerIdentity &&
        giftCardsRequiredIssuerIdentity !== databox.giftCardIssuerIdentity
      ) {
        giftCardIssuerIdentities.push(giftCardsRequiredIssuerIdentity);
      }
    }

    const sidechainSettings = await context.sidechainClientManager.defaultClient.getSettings(
      false,
      false,
    );
    const functionsByName: IDataboxApiTypes['Databox.meta']['result']['functionsByName'] = {};

    for (const [name, stats] of Object.entries(databox.statsByFunction)) {
      const { prices } = databox.functionsByName[name];
      let minimumPrice = 0;
      let pricePerQuery = 0;
      for (const price of prices) {
        minimumPrice += price.minimum;
        pricePerQuery += price.perQuery;
      }
      if (minimumPrice > 0) minimumPrice += sidechainSettings.settlementFeeMicrogons;

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
    }

    return {
      latestVersionHash: databox.latestVersionHash,
      giftCardIssuerIdentities,
      schemaInterface: databox.schemaInterface,
      functionsByName,
      computePricePerQuery,
    };
  },
});
