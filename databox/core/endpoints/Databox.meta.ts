import { IDataboxApiTypes } from '@ulixee/specification/databox';
import DataboxApiHandler from '../lib/DataboxApiHandler';
import DataboxCore from '../index';

export default new DataboxApiHandler('Databox.meta', {
  async handler(request, context) {
    await DataboxCore.start();

    const { giftCardsRequiredIssuerIdentity, giftCardsAllowed, computePricePerKb } =
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
    const functionsByName: IDataboxApiTypes['Databox.meta']['result']['functionsByName'] = {};

    for (const [name, stats] of Object.entries(databox.statsByFunction)) {
      const { pricePerQuery } = databox.functionsByName[name];
      functionsByName[name] = {
        averageMilliseconds: stats.averageMilliseconds,
        maxMilliseconds: stats.maxMilliseconds,
        averageTotalPricePerQuery: stats.averagePrice,
        maxPricePerQuery: stats.maxPrice,
        averageBytesPerQuery: stats.averageBytes,
        maxBytesPerQuery: stats.maxBytes,
        basePricePerQuery: pricePerQuery,
      };
    }

    return {
      latestVersionHash: databox.latestVersionHash,
      giftCardIssuerIdentities,
      schemaInterface: databox.schemaInterface,
      functionsByName,
      computePricePerKb,
    };
  },
});
