import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import IDataboxManifest from '@ulixee/specification/types/IDataboxManifest';
import { IDataboxApiTypes } from '@ulixee/specification/databox';
import { isSemverSatisfied } from '@ulixee/commons/lib/VersionUtils';
import DataboxApiHandler from '../lib/DataboxApiHandler';
import DataboxCore from '../index';
import PaymentProcessor from '../lib/PaymentProcessor';
import IDataboxApiContext from '../interfaces/IDataboxApiContext';
import { IDataboxRecord } from '../lib/DataboxesTable';
import { InvalidMicronoteError, MicronotePaymentRequiredError } from '../lib/errors';
import { IDataboxStatsRecord } from '../lib/DataboxStatsTable';

const giftCardIssuersById: { [giftCardId: string]: string[] } = {};
const { version } = require('../package.json');

export default new DataboxApiHandler('Databox.exec', {
  async handler(request, context) {
    if (DataboxCore.isClosing) {
      throw new CanceledPromiseError('Miner shutting down. Not accepting new work.');
    }
    await DataboxCore.start();

    const startTime = Date.now();
    const registryEntry = context.databoxRegistry.getByVersionHash(request.versionHash);
    const { coreVersion } = registryEntry;
    if (!isSemverSatisfied(coreVersion, version)) {
      throw new Error(
        `The current version of Core (${version}) is incompatible with this Databox version (${coreVersion})`,
      );
    }
    const functionName = request.functionName ?? 'default';
    if (!registryEntry.functionsByName[functionName])
      throw new Error(`${functionName} is not a valid function name for this Databox`);

    const { corePlugins } = registryEntry.functionsByName[functionName] ?? {};
    for (const [pluginName, pluginVersion] of Object.entries(corePlugins ?? {})) {
      const pluginCore = context.pluginCoresByName[pluginName];
      if (!pluginCore) {
        throw new Error(`Miner does not support required runtime dependency: ${pluginName}`);
      }

      if (!isSemverSatisfied(pluginVersion, pluginCore.version)) {
        throw new Error(
          `The current version of ${pluginName} (${pluginVersion}) is incompatible with this Databox version (${pluginVersion})`,
        );
      }
    }

    const paymentProcessor = await processPayments(context, request, functionName, registryEntry);

    const manifest: IDataboxManifest = {
      ...registryEntry,
      linkedVersions: [],
    };

    if (!(await existsAsync(registryEntry.path))) {
      await context.databoxRegistry.openDbx(manifest);
    }

    const { output } = await context.workTracker.trackRun(
      context.execDataboxFunction(
        registryEntry.path,
        request.functionName,
        manifest,
        request.input,
      ),
    );

    const resultBytes = Buffer.byteLength(Buffer.from(JSON.stringify(output), 'utf8'));
    let microgons = 0;
    if (paymentProcessor) {
      microgons = await paymentProcessor.claim(resultBytes);
    }

    const millis = Date.now() - startTime;
    context.databoxRegistry.recordStats(registryEntry.versionHash, request.functionName, {
      bytes: resultBytes,
      microgons,
      millis,
    });

    return {
      output,
      latestVersionHash: registryEntry.latestVersionHash,
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
  request: IDataboxApiTypes['Databox.exec']['args'],
  functionName: string,
  databox: IDataboxRecord & { statsByFunction: { [name: string]: IDataboxStatsRecord } },
): Promise<PaymentProcessor> {
  const { sidechainClientManager, configuration } = context;
  const stats = databox.statsByFunction[functionName];
  const pricePerQuery = databox.functionsByName[functionName].pricePerQuery;
  
  if (!request.payment?.giftCard && !request.payment?.micronote) {
    if (pricePerQuery || configuration.computePricePerKb) {
      throw new MicronotePaymentRequiredError('This databox requires payment', stats.averagePrice);
    }
    return;
  }

  if (!configuration.paymentAddress && !configuration.defaultSidechainHost) return null;

  const { giftCard, micronote } = request.payment;

  const sidechainClient = micronote
    ? await sidechainClientManager.withIdentity(micronote.sidechainIdentity)
    : sidechainClientManager.defaultClient;

  const approvedSidechainRootIdentities =
    await sidechainClientManager.getApprovedSidechainRootIdentities();
  const settings = await sidechainClient.getSettings(true);

  const paymentProcessor = new PaymentProcessor(
    request.payment,
    {
      anticipatedBytesPerQuery: stats.averageBytes,
      approvedSidechainRootIdentities,
      cachedResultDiscount: 0.2,
    },
    sidechainClient,
    settings.settlementFeeMicrogons,
    settings.latestBlockSettings,
    context.logger,
  );

  if (giftCard) {
    if (!configuration.giftCardsAllowed || !databox.giftCardIssuerIdentity) {
      const rejector = !databox.giftCardIssuerIdentity ? 'databox' : 'Miner';
      throw new InvalidMicronoteError(`This ${rejector} is not accepting gift cards.`);
    }

    let giftCardIssuers = giftCardIssuersById[giftCard.id];
    if (!giftCardIssuers) {
      giftCardIssuers =
        (await sidechainClient.giftCards.get(giftCard.id)?.then(x => x.issuerIdentities)) ?? [];
      giftCardIssuersById[giftCard.id] = giftCardIssuers;
    }

    // ensure gift card is valid for this server
    for (const issuer of [
      databox.giftCardIssuerIdentity,
      configuration.giftCardsRequiredIssuerIdentity,
    ]) {
      if (!issuer) continue;
      if (!giftCardIssuers.includes(issuer))
        throw new Error(`This gift card does not include all required issuers (${issuer})`);
    }

    if (configuration.giftCardsRequiredIssuerIdentity) {
      paymentProcessor.addAddressPayable(configuration.giftCardsRequiredIssuerIdentity, {
        pricePerKb: configuration.computePricePerKb,
      });
    }
    paymentProcessor.addAddressPayable(databox.giftCardIssuerIdentity, {
      pricePerQuery,
    });
    await paymentProcessor.createGiftCardHold();
  } else {
    paymentProcessor.addAddressPayable(configuration.paymentAddress, {
      pricePerKb: configuration.computePricePerKb,
    });
    paymentProcessor.addAddressPayable(databox.paymentAddress, {
      pricePerQuery,
    });
    await paymentProcessor.lock(request.pricingPreferences);
  }

  return paymentProcessor;
}
