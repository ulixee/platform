import Datastore, { IRunnerExecOptions } from '@ulixee/datastore';
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

    let outputs;

    const datastoreFunction =
      datastore.metadata.runnersByName[request.name] ??
      datastore.metadata.crawlersByName[request.name];
    const datastoreTable = datastore.metadata.tablesByName[request.name];
    if (datastoreFunction) {
      outputs = await extractFunctionOutputs(
        manifestWithStats,
        datastore,
        request,
        context,
        paymentProcessor,
      );
    } else if (datastoreTable) {
      // TODO: Need to put a payment hold for tables
      outputs = extractTableOutputs(datastore, request, context);
    } else {
      throw new Error(`${request.name} is not a valid Runner name for this Datastore.`);
    }

    const bytes = PaymentProcessor.getOfficialBytes(outputs);
    const microgons = await paymentProcessor.settle(bytes);
    const milliseconds = Date.now() - startTime;
    context.datastoreRegistry.recordStats(request.versionHash, request.name, {
      bytes,
      microgons,
      milliseconds,
    });

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
  paymentProcessor: PaymentProcessor,
): Promise<any[]> {
  await paymentProcessor.createHold(
    manifestWithStats,
    [{ name: request.name, id: 1 }],
    request.pricingPreferences,
  );

  validateFunctionCoreVersions(manifestWithStats, request.name, context);

  return await context.workTracker.trackRun(
    (async () => {
      const options: IRunnerExecOptions<any> = {
        input: request.input,
        authentication: request.authentication,
        affiliateId: request.affiliateId,
        payment: request.payment,
      };

      for (const plugin of Object.values(DatastoreCore.pluginCoresByName)) {
        if (plugin.beforeExecRunner) await plugin.beforeExecRunner(options);
      }

      const func = datastore.runners[request.name] ?? datastore.crawlers[request.name];
      const results = func.runInternal(options);
      for await (const result of results) {
        context.connectionToClient.sendEvent({
          listenerId: request.streamId,
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
      listenerId: request.streamId,
      data: result,
      eventType: 'Stream.output',
    });
  }

  return results;
}
