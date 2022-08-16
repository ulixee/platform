import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import IDataboxManifest from '@ulixee/specification/types/IDataboxManifest';
import { IDataboxApiTypes } from '@ulixee/specification/databox';
import DataboxApiHandler from '../lib/DataboxApiHandler';
import DataboxCore from '../index';
import PaymentProcessor from '../lib/PaymentProcessor';
import IDataboxApiContext from '../interfaces/IDataboxApiContext';
import { IDataboxRecord } from '../lib/DataboxesTable';
import { InvalidMicronoteError, MicronotePaymentRequiredError } from '../lib/errors';
import { IDataboxStatsRecord } from '../lib/DataboxStatsTable';

export default new DataboxApiHandler('Databox.run', {
  async handler(request, context) {
    if (DataboxCore.isClosing)
      throw new CanceledPromiseError('Server shutting down. Not accepting new work.');
    await DataboxCore.start();

    const startTime = Date.now();
    const databox = context.databoxRegistry.getByVersionHash(request.versionHash);
    const { runtimeName, runtimeVersion } = databox;

    const runner = context.coreRuntimesByName[runtimeName];
    if (!runner) {
      throw new Error(`Server does not support required databox runtime: ${runtimeName}`);
    }

    if (!runner.canSatisfyVersion(runtimeVersion)) {
      throw new Error(
        `The current version of ${runtimeName} (${runner.databoxRuntimeVersion}) is incompatible with this Databox version (${runtimeVersion})`,
      );
    }

    const paymentProcessor = await processPayments(context, request, databox);

    const manifest: IDataboxManifest = {
      ...databox,
      linkedVersions: [],
    };

    if (!(await existsAsync(databox.path))) {
      await context.databoxRegistry.openDbx(manifest);
    }

    const { output } = await context.workTracker.trackRun(
      runner.run(databox.path, manifest, request.input),
    );

    const resultBytes = Buffer.byteLength(Buffer.from(JSON.stringify(output), 'utf8'));
    let microgons = 0;
    if (paymentProcessor) {
      microgons = await paymentProcessor.claim(resultBytes);
    }

    const millis = Date.now() - startTime;
    context.databoxRegistry.recordStats(databox.versionHash, {
      bytes: resultBytes,
      microgons,
      millis,
    });

    return {
      output,
      latestVersionHash: databox.latestVersionHash,
      metadata: {
        milliseconds: millis,
        microgons,
        bytes: resultBytes,
      },
    };
  },
});

async function processPayments(
  context: IDataboxApiContext,
  request: IDataboxApiTypes['Databox.run']['args'],
  databox: IDataboxRecord & { stats: IDataboxStatsRecord },
): Promise<PaymentProcessor> {
  const { sidechainClientManager, configuration } = context;

  if (!request.payment) {
    if (databox.pricePerQuery || configuration.computePricePerKb) {
      throw new MicronotePaymentRequiredError(
        'This databox requires payment',
        databox.stats.averagePrice,
      );
    }
    return;
  }

  if (!configuration.paymentAddress && !configuration.defaultSidechainHost) return null;

  const sidechainClient = await sidechainClientManager.withIdentity(
    request.payment.sidechainIdentity,
  );
  const approvedSidechainRootIdentities =
    await sidechainClientManager.getApprovedSidechainRootIdentities();
  const settings = await sidechainClient.getSettings(true);

  const paymentProcessor = new PaymentProcessor(
    request.payment,
    {
      anticipatedBytesPerQuery: databox.stats.averageBytes,
      approvedSidechainRootIdentities,
      cachedResultDiscount: 0.2,
    },
    sidechainClient,
    settings.settlementFeeMicrogons,
    settings.latestBlockSettings,
    context.logger,
  );

  if (request.payment.isGiftCardBatch) {
    if (!configuration.giftCardAddress || !databox.giftCardAddress) {
      const rejector = !databox.giftCardAddress ? 'databox' : 'server';
      throw new InvalidMicronoteError(`This ${rejector} is not accepting gift cards.`);
    }
    paymentProcessor.addAddressPayable(configuration.giftCardAddress, {
      pricePerKb: configuration.computePricePerKb,
    });
    paymentProcessor.addAddressPayable(databox.giftCardAddress, {
      pricePerQuery: databox.pricePerQuery,
    });
  } else {
    paymentProcessor.addAddressPayable(configuration.paymentAddress, {
      pricePerKb: configuration.computePricePerKb,
    });
    paymentProcessor.addAddressPayable(databox.paymentAddress, {
      pricePerQuery: databox.pricePerQuery,
    });
  }

  await paymentProcessor.lock(request.pricingPreferences);
  return paymentProcessor;
}
