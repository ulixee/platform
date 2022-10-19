import DataboxApiHandler from '../lib/DataboxApiHandler';
import DataboxCore from '../index';

export default new DataboxApiHandler('Databox.meta', {
  async handler(request, context) {
    await DataboxCore.start();

    const databox = context.databoxRegistry.getByVersionHash(request.versionHash);
    const giftCardPaymentAddresses: string[] = [];

    if (context.configuration.giftCardAddress && databox.giftCardAddress) {
      giftCardPaymentAddresses.push(databox.giftCardAddress);
      if (context.configuration.giftCardAddress !== databox.giftCardAddress) {
        giftCardPaymentAddresses.push(context.configuration.giftCardAddress);
      }
    }

    return {
      latestVersionHash: databox.latestVersionHash,
      giftCardPaymentAddresses,
      averageMilliseconds: databox.stats.averageMilliseconds,
      maxMilliseconds: databox.stats.maxMilliseconds,
      averageTotalPricePerQuery: databox.stats.averagePrice,
      maxPricePerQuery: databox.stats.maxPrice,
      averageBytesPerQuery: databox.stats.averageBytes,
      maxBytesPerQuery: databox.stats.maxBytes,
      basePricePerQuery: databox.pricePerQuery,
      computePricePerKb: context.configuration.computePricePerKb,
      schemaInterface: databox.schemaInterface,
    };
  },
});
