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

    const heroSessionIds: string[] = [];

    const finalResult = await datastore
      .queryInternal(request.sql, request.boundValues, request.id, {
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
          options.trackMetadata = (metaName, metaValue) => {
            if (metaName === 'heroSessionId') {
              if (!heroSessionIds.includes(metaValue)) heroSessionIds.push(metaValue);
            }
          };
          for (const plugin of Object.values(DatastoreCore.pluginCoresByName)) {
            if (plugin.beforeExecRunner) await plugin.beforeExecRunner(options);
          }

          let runError: Error;
          let outputs: any;
          let bytes = 0;
          let microgons = 0;
          try {
            outputs = await context.workTracker.trackRun(run(options));
            // release the hold
            bytes = PaymentProcessor.getOfficialBytes(outputs);
            microgons = paymentProcessor.releaseLocalFunctionHold(id, bytes);
          } catch (error) {
            runError = error;
          }

          const milliseconds = Date.now() - runStart;
          context.datastoreRegistry.recordItemStats(
            request.versionHash,
            name,
            {
              bytes,
              microgons,
              milliseconds,
              isCredits: !!request.payment?.credits,
            },
            runError,
          );
          // Do we need to rollback the stats? We won't finalize payment in this scenario.
          if (runError) throw runError;
          return outputs;
        },
        async onPassthroughTable(name, options, run) {
          Object.assign(options, {
            payment: request.payment,
            authentication: request.authentication,
          });
          return await context.workTracker.trackRun(run(options));
        },
      })
      .catch(error => error);

    let outputs: any[];
    let runError: Error;
    if (finalResult instanceof Error) {
      runError = finalResult;
    } else {
      outputs = finalResult;
    }
    const resultBytes = outputs ? PaymentProcessor.getOfficialBytes(outputs) : 0;
    const microgons = await paymentProcessor.settle(resultBytes);

    const metadata = {
      bytes: resultBytes,
      microgons,
      milliseconds: Date.now() - startTime,
    };

    context.datastoreRegistry.recordQuery(
      request.id,
      request.sql,
      startTime,
      request.boundValues,
      outputs,
      request.versionHash,
      {
        ...metadata,
        isCredits: !!request.payment?.credits,
      },
      request.affiliateId,
      runError,
      heroSessionIds,
    );

    // TODO: should we return this to client so that the rest of the metadata is visible?
    if (runError) throw runError;

    return {
      outputs,
      latestVersionHash: datastoreVersion.latestVersionHash,
      metadata,
    };
  },
});
