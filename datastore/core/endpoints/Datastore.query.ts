import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import DatastoreCore from '../index';
import PaymentProcessor from '../lib/PaymentProcessor';
import DatastoreVm from '../lib/DatastoreVm';
import { validateAuthentication, validateFunctionCoreVersions } from '../lib/datastoreUtils';

export default new DatastoreApiHandler('Datastore.query', {
  async handler(request, context) {
    request.boundValues ??= [];

    const startTime = Date.now();
    const manifestWithStats = await context.datastoreRegistry.getByVersionHash(request.versionHash);

    const storage = context.datastoreRegistry.getStorage(request.versionHash);

    const datastore = await DatastoreVm.open(manifestWithStats.path, storage, manifestWithStats);

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
            manifestWithStats,
            functionCallsById,
            request.pricingPreferences,
          );
        },
        async onFunction(id, name, options, run) {
          const runStart = Date.now();
          validateFunctionCoreVersions(manifestWithStats, name, context);

          Object.assign(options, {
            payment: request.payment,
            authentication: request.authentication,
            affiliateId: request.affiliateId,
            versionHash: request.versionHash,
          });
          options.trackMetadata = (metaName, metaValue) => {
            if (metaName === 'heroSessionId') {
              if (!heroSessionIds.includes(metaValue)) heroSessionIds.push(metaValue);
            }
          };
          for (const plugin of Object.values(DatastoreCore.pluginCoresByName)) {
            if (plugin.beforeRunExtractor)
              await plugin.beforeRunExtractor(options, {
                scriptEntrypoint: manifestWithStats.path,
                functionName: name,
              });
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
            versionHash: request.versionHash,
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
      request.payment?.micronote?.micronoteId,
      request.payment?.credits?.id,
      request.affiliateId,
      runError,
      heroSessionIds,
    );

    // TODO: should we return this to client so that the rest of the metadata is visible?
    if (runError) throw runError;

    return {
      outputs,
      latestVersionHash: manifestWithStats.latestVersionHash,
      metadata,
    };
  },
});
