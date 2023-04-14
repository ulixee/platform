import Datastore, { IExtractorRunOptions } from '@ulixee/datastore';
import IDatastoreApis from '@ulixee/platform-specification/datastore/DatastoreApis';
import { SqlGenerator } from '@ulixee/sql-engine';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import DatastoreCore from '../index';
import PaymentProcessor from '../lib/PaymentProcessor';
import DatastoreVm from '../lib/DatastoreVm';
import { validateAuthentication, validateFunctionCoreVersions } from '../lib/datastoreUtils';
import { IDatastoreManifestWithStats } from '../lib/DatastoreRegistry';
import IDatastoreApiContext from '../interfaces/IDatastoreApiContext';

export default new DatastoreApiHandler('Datastore.stream', {
  async handler(request, context) {
    const startTime = Date.now();
    const manifestWithStats = await context.datastoreRegistry.getByVersionHash(request.versionHash);
    const storage = context.datastoreRegistry.getStorage(request.versionHash);
    const datastore = await DatastoreVm.open(manifestWithStats.path, storage, manifestWithStats);
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
        manifestWithStats,
        [{ name: request.name, id: 1 }],
        request.pricingPreferences,
      );
    } catch (error) {
      runError = error;
      context.datastoreRegistry.recordQuery(
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
          manifestWithStats,
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
    context.datastoreRegistry.recordItemStats(request.versionHash, request.name, stats, runError);
    context.datastoreRegistry.recordQuery(
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
      latestVersionHash: manifestWithStats.latestVersionHash,
      metadata: {
        bytes,
        microgons,
        milliseconds,
      },
    };
  },
});

async function extractFunctionOutputs(
  manifestWithStats: IDatastoreManifestWithStats,
  datastore: Datastore,
  request: IDatastoreApis['Datastore.stream']['args'],
  context: IDatastoreApiContext,
  heroSessionIds: string[],
): Promise<any[]> {
  validateFunctionCoreVersions(manifestWithStats, request.name, context);
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
        if (plugin.beforeRunExtractor) await plugin.beforeRunExtractor(options);
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

function extractTableOutputs(
  datastore: Datastore,
  request: IDatastoreApis['Datastore.stream']['args'],
  context: IDatastoreApiContext,
): any[] {
  const storage = context.datastoreRegistry.getStorage(request.versionHash);

  const db = storage.db;
  const schema = storage.getTableSchema(request.name);
  const { sql, boundValues } = SqlGenerator.createWhereClause(
    request.name,
    request.input,
    ['*'],
    1000,
  );

  const results = db.prepare(sql).all(boundValues);

  SqlGenerator.convertRecordsFromSqlite(results, [schema]);

  for (const result of results) {
    context.connectionToClient.sendEvent({
      listenerId: request.id,
      data: result,
      eventType: 'Stream.output',
    });
  }

  return results;
}
