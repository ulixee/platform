import DataboxApiHandler from '../lib/DataboxApiHandler';
import DataboxCore from '../index';

export default new DataboxApiHandler('Databox.meta', {
  async handler(request, context) {
    await DataboxCore.start();

    const databox = context.databoxRegistry.getByVersionHash(request.versionHash);
    const creditPaymentAddresses: string[] = [];

    if (context.configuration.creditsAddress && databox.creditsAddress) {
      creditPaymentAddresses.push(databox.creditsAddress);
      if (context.configuration.creditsAddress !== databox.creditsAddress) {
        creditPaymentAddresses.push(context.configuration.creditsAddress);
      }
    }

    return {
      latestVersionHash: databox.latestVersionHash,
      creditPaymentAddresses,
      averageMilliseconds: databox.stats.averageMilliseconds,
      maxMilliseconds: databox.stats.maxMilliseconds,
      averageTotalPricePerQuery: databox.stats.averagePrice,
      maxPricePerQuery: databox.stats.maxPrice,
      averageBytesPerQuery: databox.stats.averageBytes,
      maxBytesPerQuery: databox.stats.maxBytes,
      basePricePerQuery: databox.pricePerQuery,
      computePricePerKb: context.configuration.computePricePerKb,
      schema: null,
    };
  },
});
