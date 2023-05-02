import Datastore, { IExtractorRunOptions } from '@ulixee/datastore';
import IDatastoreApis from '@ulixee/platform-specification/datastore/DatastoreApis';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import DatastoreCore from '../index';
import PaymentProcessor from '../lib/PaymentProcessor';
import { validateAuthentication, validateFunctionCoreVersions } from '../lib/datastoreUtils';
import { IDatastoreManifestWithRuntime } from '../lib/DatastoreRegistry';
import IDatastoreApiContext from '../interfaces/IDatastoreApiContext';

export default new DatastoreApiHandler('Datastore.stream', {
  async handler(request, context) {
    const startTime = Date.now();
    const manifestWithRuntime = await context.datastoreRegistry.getByVersionHash(
      request.versionHash,
    );
    const storage = context.storageEngineRegistry.get(manifestWithRuntime);
    const datastore = await context.vm.open(
      manifestWithRuntime.entrypointPath,
      storage,
      manifestWithRuntime,
    );
    await validateAuthentication(datastore, request.payment, request.authentication);
    const paymentProcessor = new PaymentProcessor(request.payment, datastore, context);

    const heroSessionIds: string[] = [];

    let outputs;
    let bytes = 0;
    let runError: Error;
    let microgons = 0;
    const isCredits = !!request.payment?.credits;

    const datastoreFunction =
      datastore.metadata.extractorsByName[request.name] ??
      datastore.metadata.crawlersByName[request.name];
    const datastoreTable = datastore.metadata.tablesByName[request.name];

    try {
      await paymentProcessor.createHold(
        manifestWithRuntime,
        [{ name: request.name, id: 1 }],
        request.pricingPreferences,
      );
    } catch (error) {
      runError = error;
      context.statsTracker.recordQuery(
        request.id,
        `stream(${request.name})`,
        startTime,
        request.input,
        outputs,
        request.versionHash,
        {
          milliseconds: Date.now() - startTime,
          microgons,
          bytes,
          isCredits,
        },
        request.payment?.micronote?.micronoteId,
        request.payment?.credits?.id,
        request.affiliateId,
        runError,
      );
      throw runError;
    }

    try {
      if (datastoreFunction) {
        outputs = await extractFunctionOutputs(
          manifestWithRuntime,
          datastore,
          request,
          context,
          heroSessionIds,
        );
      } else if (datastoreTable) {
        outputs = extractTableOutputs(datastore, request, context);
      } else {
        throw new Error(`${request.name} is not a valid Extractor name for this Datastore.`);
      }

      bytes = PaymentProcessor.getOfficialBytes(outputs);
      microgons = await paymentProcessor.settle(bytes);
    } catch (error) {
      runError = error;
    }

    const milliseconds = Date.now() - startTime;
    const stats = {
      bytes,
      microgons,
      milliseconds,
      isCredits,
    };
    context.statsTracker.recordEntityStats(request.versionHash, request.name, stats, runError);
    context.statsTracker.recordQuery(
      request.id,
      `stream(${request.name})`,
      startTime,
      request.input,
      outputs,
      request.versionHash,
      stats,
      request.payment?.micronote?.micronoteId,
      request.payment?.credits?.id,
      request.affiliateId,
      runError,
      heroSessionIds,
    );

    if (runError) throw runError;

    return {
      latestVersionHash: manifestWithRuntime.latestVersionHash,
      metadata: {
        bytes,
        microgons,
        milliseconds,
      },
    };
  },
});

async function extractFunctionOutputs(
  manifestWithRuntime: IDatastoreManifestWithRuntime,
  datastore: Datastore,
  request: IDatastoreApis['Datastore.stream']['args'],
  context: IDatastoreApiContext,
  heroSessionIds: string[],
): Promise<any[]> {
  validateFunctionCoreVersions(manifestWithRuntime, request.name, context);
  const options: IExtractorRunOptions<any> = {
    input: request.input,
    authentication: request.authentication,
    affiliateId: request.affiliateId,
    payment: request.payment,
  };
  options.trackMetadata = (metaName, metaValue) => {
    if (metaName === 'heroSessionId') {
      if (!heroSessionIds.includes(metaValue)) heroSessionIds.push(metaValue);
    }
  };
  return await context.workTracker.trackRun(
    (async () => {
      for (const plugin of Object.values(DatastoreCore.pluginCoresByName)) {
        if (plugin.beforeRunExtractor) {
          await plugin.beforeRunExtractor(options, {
            scriptEntrypoint: manifestWithRuntime.entrypointPath,
            functionName: request.name,
          });
        }
      }

      const func = datastore.extractors[request.name] ?? datastore.crawlers[request.name];
      const results = func.runInternal(options, {
        async onFunction(id, name, initialOptions, run) {
          const runStart = Date.now();
          let runError: Error;
          let outputs: any;
          let bytes = 0;
          const microgons = 0;
          try {
            outputs = await context.workTracker.trackRun(run(options));
            // release the hold
            bytes = PaymentProcessor.getOfficialBytes(outputs);
          } catch (error) {
            runError = error;
          }

          const milliseconds = Date.now() - runStart;
          context.statsTracker.recordEntityStats(
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
          if (runError instanceof Error) throw runError;
          return outputs;
        },
      });
      for await (const result of results) {
        context.connectionToClient.sendEvent({
          listenerId: request.id,
          data: result,
          eventType: 'Stream.output',
        });
      }
      return results;
    })(),
  );
}

async function extractTableOutputs(
  datastore: Datastore,
  request: IDatastoreApis['Datastore.stream']['args'],
  context: IDatastoreApiContext,
): Promise<any[]> {
  const records = await datastore.tables[request.name].fetchInternal({ input: request.input });

  for (const result of records) {
    context.connectionToClient.sendEvent({
      listenerId: request.id,
      data: result as any,
      eventType: 'Stream.output',
    });
  }

  return records;
}
