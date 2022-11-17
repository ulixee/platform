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

    return {
      latestVersionHash: databox.latestVersionHash,
      giftCardIssuerIdentities,
      averageMilliseconds: databox.stats.averageMilliseconds,
      maxMilliseconds: databox.stats.maxMilliseconds,
      averageTotalPricePerQuery: databox.stats.averagePrice,
      maxPricePerQuery: databox.stats.maxPrice,
      averageBytesPerQuery: databox.stats.averageBytes,
      maxBytesPerQuery: databox.stats.maxBytes,
      basePricePerQuery: databox.pricePerQuery,
      computePricePerKb,
      schemaInterface: databox.schemaInterface,
    };
  },
});
