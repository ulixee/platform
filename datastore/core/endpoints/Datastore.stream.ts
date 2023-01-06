import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import DatastoreCore from '../index';
import PaymentProcessor from '../lib/PaymentProcessor';
import DatastoreVm from '../lib/DatastoreVm';
import { validateAuthentication, validateFunctionCoreVersions } from '../lib/datastoreUtils';

export default new DatastoreApiHandler('Datastore.stream', {
  async handler(request, context) {
    if (DatastoreCore.isClosing) {
      throw new CanceledPromiseError('Miner shutting down. Not accepting new work.');
    }
    await DatastoreCore.start();

    const startTime = Date.now();
    const { registryEntry, manifest } = await context.datastoreRegistry.loadVersion(
      request.versionHash,
    );

    const datastore = await DatastoreVm.open(registryEntry.path, manifest);

    const datastoreFunction = datastore.metadata.functionsByName[request.functionName];

    if (!datastoreFunction) {
      throw new Error(`${request.functionName} is not a valid Function name for this Datastore.`);
    }

    await validateAuthentication(datastore, request.payment, request.authentication);

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
        for (const plugin of Object.values(DatastoreCore.pluginCoresByName)) {
          if (plugin.beforeExecFunction) await plugin.beforeExecFunction(options);
        }

        const results = datastore.functions[functionName].stream(options);
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
    context.datastoreRegistry.recordStats(request.versionHash, functionName, {
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
