import Datastore, { IFunctionExecOptions } from '@ulixee/datastore';
import IDatastoreApis from '@ulixee/specification/datastore/DatastoreApis';
import { SqlGenerator } from '@ulixee/sql-engine';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import DatastoreCore from '../index';
import PaymentProcessor from '../lib/PaymentProcessor';
import DatastoreVm from '../lib/DatastoreVm';
import { validateAuthentication, validateFunctionCoreVersions } from '../lib/datastoreUtils';
import { IDatastoreManifestWithStats } from '../lib/DatastoreRegistry';
import IDatastoreApiContext from '../interfaces/IDatastoreApiContext';
import DatastoreStorage from '../lib/DatastoreStorage';

export default new DatastoreApiHandler('Datastore.stream', {
  async handler(request, context) {
    const startTime = Date.now();
    const manifestWithStats = await context.datastoreRegistry.getByVersionHash(request.versionHash);
    const datastore = await DatastoreVm.open(manifestWithStats.path, manifestWithStats);
    await validateAuthentication(datastore, request.payment, request.authentication);
    const paymentProcessor = new PaymentProcessor(request.payment, datastore, context);

    let outputs;

    const datastoreFunction = datastore.metadata.functionsByName[request.name];
    const datastoreTable = datastore.metadata.tablesByName[request.name];
    if (datastoreFunction) {
      outputs = await extractFunctionOutputs(manifestWithStats, datastore, request, context, paymentProcessor);
    } else if (datastoreTable) {
      // TODO: Need to put a payment hold for tables
      outputs = extractTableOutputs(datastore, request, context);
    } else {
      throw new Error(`${request.name} is not a valid Function name for this Datastore.`);
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
    [{ functionName: request.name, id: 1 }],
    request.pricingPreferences,
  );

  validateFunctionCoreVersions(manifestWithStats, request.name, context);

  return await context.workTracker.trackRun(
    (async () => {
      const options: IFunctionExecOptions<any> = {
        input: request.input,
        authentication: request.authentication,
        affiliateId: request.affiliateId,
        payment: request.payment,
      };

      for (const plugin of Object.values(DatastoreCore.pluginCoresByName)) {
        if (plugin.beforeExecFunction) await plugin.beforeExecFunction(options);
      }

      const results = datastore.functions[request.name].runInternal(options);
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
}

function extractTableOutputs(
  datastore: Datastore, 
  request: IDatastoreApis['Datastore.stream']['args'],
  context: IDatastoreApiContext, 
): any[] {
  let storage: DatastoreStorage;
  if (request.versionHash) {
    const storagePath = context.datastoreRegistry.getStoragePath(request.versionHash);
    storage = new DatastoreStorage(storagePath);
  } else {
    context.connectionToClient.datastoreStorage ??= new DatastoreStorage();
    storage = context.connectionToClient?.datastoreStorage;
  }

  const db = storage.db;
  const schema = datastore.tables[request.name].schema;

  const fields = ['*'];
  const where: string[] = [];
  const boundValues: string[] = [];

  for (const field of Object.keys(request.input || {})) {
    const value = request.input[field];
    if (!(field in schema)) {
      throw new Error(`${field} does not exist in schema for table: ${request.name}`);
    }
    where.push(`"${field}"=?`);
    boundValues.push(value);
  }

  const whereSql = where.length ? `WHERE ${where.join(', ')} ` : '';
  const sql = `SELECT ${fields.join(',')} from "${request.name}" ${whereSql}LIMIT 1000`;  
  const results = db.prepare(sql).all(boundValues);

  SqlGenerator.convertRecordsFromSqlite(results, [schema]);

  for (const result of results) {
    context.connectionToClient.sendEvent({
      listenerId: request.streamId,
      data: result,
      eventType: 'FunctionStream.output',
    });
  }

  return results;
}