import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import DataboxApiHandler from '../lib/DataboxApiHandler';
import DataboxCore from '../index';
import PaymentProcessor from '../lib/PaymentProcessor';
import DataboxVm from '../lib/DataboxVm';
import { validateAuthentication, validateFunctionCoreVersions } from '../lib/databoxUtils';

export default new DataboxApiHandler('Databox.stream', {
  async handler(request, context) {
    if (DataboxCore.isClosing) {
      throw new CanceledPromiseError('Miner shutting down. Not accepting new work.');
    }
    await DataboxCore.start();

    const startTime = Date.now();
    const { registryEntry, manifest } = await context.databoxRegistry.loadVersion(
      request.versionHash,
    );

    const databox = await DataboxVm.open(registryEntry.path, manifest);

    const databoxFunction = databox.metadata.functionsByName[request.functionName];

    if (!databoxFunction) {
      throw new Error(`${request.functionName} is not a valid Function name for this Databox.`);
    }

    await validateAuthentication(databox, request.payment, request.authentication);

    const paymentProcessor = new PaymentProcessor(request.payment, context);

    const { functionName, input } = request;
    await paymentProcessor.createHold(
      registryEntry,
      [{ functionName, id: 1 }],
      request.pricingPreferences,
    );

    validateFunctionCoreVersions(registryEntry, functionName, context);

    const outputs = await context.workTracker.trackRun(
      (async () => {
        const options = { input, payment: request.payment, authentication: request.authentication };
        for (const plugin of Object.values(DataboxCore.pluginCoresByName)) {
          if (plugin.beforeExecFunction) await plugin.beforeExecFunction(options);
        }

        const results = databox.functions[functionName].stream(options);
        for await (const result of results) {
          context.connectionToClient.sendEvent({
            listenerId: request.streamId,
            data: result,
            eventType: 'FunctionStream.output',
          });
        }
        return results;
      })(),
    );

    const bytes = PaymentProcessor.getOfficialBytes(outputs);
    const microgons = await paymentProcessor.settle(bytes);
    const milliseconds = Date.now() - startTime;
    context.databoxRegistry.recordStats(request.versionHash, functionName, {
      bytes,
      microgons,
      milliseconds,
    });

    return {
      latestVersionHash: registryEntry.latestVersionHash,
      metadata: {
        bytes,
        microgons,
        milliseconds,
      },
    };
  },
});
