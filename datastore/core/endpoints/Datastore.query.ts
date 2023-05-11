import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import DatastoreCore from '../index';
import PaymentProcessor from '../lib/PaymentProcessor';
import { validateAuthentication, validateFunctionCoreVersions } from '../lib/datastoreUtils';

export default new DatastoreApiHandler('Datastore.query', {
  async handler(request, context) {
    request.boundValues ??= [];
    const { id: queryId, affiliateId, payment, authentication, versionHash } = request;

    const startTime = Date.now();
    const manifestWithRuntime = await context.datastoreRegistry.getByVersionHash(versionHash);

    const storage = context.storageEngineRegistry.get(manifestWithRuntime);

    const datastore = await context.vm.open(
      manifestWithRuntime.runtimePath,
      storage,
      manifestWithRuntime,
    );

    await validateAuthentication(datastore, payment, authentication);

    const paymentProcessor = new PaymentProcessor(payment, datastore, context);

    const heroSessionIds: string[] = [];

    const finalResult = await datastore
      .queryInternal(
        request.sql,
        request.boundValues,
        {
          versionHash,
          id: queryId,
          payment,
          authentication,
        },
        {
          async beforeAll({ sqlParser, functionCallsById }) {
            if (!sqlParser.isSelect()) throw new Error('Invalid SQL command');

            for (const name of sqlParser.tableNames) {
              const table = datastore.tables[name];
              if (!table.isPublic) throw new Error(`Table ${name} is not publicly accessible.`);
            }

            await paymentProcessor.createHold(
              manifestWithRuntime,
              functionCallsById,
              request.pricingPreferences,
            );
          },
          async onFunction(id, name, options, run) {
            const runStart = Date.now();
            validateFunctionCoreVersions(manifestWithRuntime, name, context);

            Object.assign(options, {
              payment,
              authentication,
              affiliateId,
              versionHash,
            });
            options.trackMetadata = (metaName, metaValue) => {
              if (metaName === 'heroSessionId') {
                if (!heroSessionIds.includes(metaValue)) heroSessionIds.push(metaValue);
              }
            };
            for (const plugin of Object.values(DatastoreCore.pluginCoresByName)) {
              if (plugin.beforeRunExtractor)
                await plugin.beforeRunExtractor(options, {
                  scriptEntrypoint: manifestWithRuntime.runtimePath,
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
            await context.statsTracker.recordEntityStats({
              versionHash: request.versionHash,
              entityName: name,
              bytes,
              microgons,
              milliseconds,
              didUseCredits: !!request.payment?.credits,
              error: runError,
            });
            // Do we need to rollback the stats? We won't finalize payment in this scenario.
            if (runError) throw runError;
            return outputs;
          },
          async onPassthroughTable(name, options, run) {
            Object.assign(options, {
              payment,
              authentication,
              versionHash,
            });
            return await context.workTracker.trackRun(run(options));
          },
        },
      )
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

    await context.statsTracker.recordQuery({
      id: queryId,
      query: request.sql,
      startTime,
      input: request.boundValues,
      outputs,
      versionHash,
      ...metadata,
      micronoteId: payment?.micronote?.micronoteId,
      creditId: payment?.credits?.id,
      affiliateId,
      error: runError,
      heroSessionIds,
    });

    // TODO: should we return this to client so that the rest of the metadata is visible?
    if (runError) throw runError;

    return {
      outputs,
      latestVersionHash: manifestWithRuntime.latestVersionHash,
      metadata,
    };
  },
});
