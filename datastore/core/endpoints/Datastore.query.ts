import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import DatastoreCore from '../index';
import PaymentProcessor from '../lib/PaymentProcessor';
import DatastoreVm from '../lib/DatastoreVm';
import { validateAuthentication, validateFunctionCoreVersions } from '../lib/datastoreUtils';

export default new DatastoreApiHandler('Datastore.query', {
  async handler(request, context) {
    request.boundValues ??= [];

    const startTime = Date.now();
    const datastoreVersion = await context.datastoreRegistry.getByVersionHash(request.versionHash);

    const storage = context.datastoreRegistry.getStorage(request.versionHash);

    const datastore = await DatastoreVm.open(datastoreVersion.path, storage, datastoreVersion);

    await validateAuthentication(datastore, request.payment, request.authentication);

    const paymentProcessor = new PaymentProcessor(request.payment, datastore, context);

    const outputs = await datastore.queryInternal(request.sql, request.boundValues, {
      async beforeAll({ sqlParser, functionCallsById }) {
        if (!sqlParser.isSelect()) throw new Error('Invalid SQL command');

        for (const name of sqlParser.tableNames) {
          const table = datastore.tables[name];
          if (!table.isPublic) throw new Error(`Table ${name} is not publicly accessible.`);
        }

        await paymentProcessor.createHold(
          datastoreVersion,
          functionCallsById,
          request.pricingPreferences,
        );
      },
      async onFunction(id, name, options, run) {
        const runStart = Date.now();
        validateFunctionCoreVersions(datastoreVersion, name, context);

        Object.assign(options, {
          payment: request.payment,
          authentication: request.authentication,
          affiliateId: request.affiliateId,
        });
        for (const plugin of Object.values(DatastoreCore.pluginCoresByName)) {
          if (plugin.beforeExecRunner) await plugin.beforeExecRunner(options);
        }

        const result = await context.workTracker.trackRun(run(options));
        // release the hold
        const bytes = PaymentProcessor.getOfficialBytes(result);
        const microgons = paymentProcessor.releaseLocalFunctionHold(id, bytes);

        const milliseconds = Date.now() - runStart;
        context.datastoreRegistry.recordStats(request.versionHash, name, {
          bytes,
          microgons,
          milliseconds,
        });
        return result;
      },
      async onPassthroughTable(name, options, run) {
        Object.assign(options, {
          payment: request.payment,
          authentication: request.authentication,
        });
        return await context.workTracker.trackRun(run(options));
      },
    });

    const resultBytes = PaymentProcessor.getOfficialBytes(outputs);
    const microgons = await paymentProcessor.settle(resultBytes);
    return {
      outputs,
      latestVersionHash: datastoreVersion.latestVersionHash,
      metadata: {
        bytes: resultBytes,
        microgons,
        milliseconds: Date.now() - startTime,
      },
    };
  },
});
