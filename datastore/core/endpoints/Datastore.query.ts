import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import { SqlParser } from '@ulixee/sql-engine';
import SqlQuery from '../lib/SqlQuery';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import DatastoreCore from '../index';
import PaymentProcessor from '../lib/PaymentProcessor';
import DatastoreStorage from '../lib/DatastoreStorage';
import DatastoreVm from '../lib/DatastoreVm';
import { validateAuthentication, validateFunctionCoreVersions } from '../lib/datastoreUtils';

export default new DatastoreApiHandler('Datastore.query', {
  async handler(request, context) {
    if (DatastoreCore.isClosing) {
      throw new CanceledPromiseError('Miner shutting down. Not accepting new work.');
    }
    await DatastoreCore.start();
    request.boundValues ??= [];

    const startTime = Date.now();
    const { registryEntry, manifest } = await context.datastoreRegistry.loadVersion(
      request.versionHash,
    );

    let storage: DatastoreStorage;
    if (request.versionHash) {
      const storagePath = context.datastoreRegistry.getStoragePath(request.versionHash);
      storage = new DatastoreStorage(storagePath);
    } else {
      context.connectionToClient.datastoreStorage ??= new DatastoreStorage();
      storage = context.connectionToClient?.datastoreStorage;
    }

    const db = storage.db;
    const datastore = await DatastoreVm.open(registryEntry.path, manifest);

    await validateAuthentication(datastore, request.payment, request.authentication);

    const sqlParser = new SqlParser(request.sql);
    if (!sqlParser.isSelect()) throw new Error('Invalid SQL command');

    const metadata = datastore.metadata;
    sqlParser.functionNames.forEach(functionName => {
      const schema = metadata.functionsByName[functionName].schema || {};
      storage.addFunctionSchema(functionName, schema);
    });

    sqlParser.tableNames.forEach(functionName => {
      const schema = metadata.tablesByName[functionName].schema || {};
      storage.addTableSchema(functionName, schema);
    });

    const inputByFunctionName = sqlParser.extractFunctionInputs(
      storage.schemasByFunctionName,
      request.boundValues,
    );
    const outputsByFunctionName: { [name: string]: any[] } = {};

    const paymentProcessor = new PaymentProcessor(request.payment, context);

    const functionsWithTempIds = Object.keys(inputByFunctionName).map((x, i) => {
      return {
        functionName: x,
        id: i,
      };
    });

    await paymentProcessor.createHold(
      registryEntry,
      functionsWithTempIds,
      request.pricingPreferences,
    );

    for (const { functionName, id } of functionsWithTempIds) {
      const functionStart = Date.now();
      const functionInput = inputByFunctionName[functionName];
      validateFunctionCoreVersions(registryEntry, functionName, context);

      const outputs = await context.workTracker.trackRun(
        (async () => {
          const options = {
            input: functionInput,
            payment: request.payment,
            authentication: request.authentication,
          };
          for (const plugin of Object.values(DatastoreCore.pluginCoresByName)) {
            if (plugin.beforeExecFunction) await plugin.beforeExecFunction(options);
          }

          return await datastore.functions[functionName].stream(options);
        })(),
      );
      outputsByFunctionName[functionName] = outputs;

      // release the hold
      const bytes = PaymentProcessor.getOfficialBytes(outputs);
      const microgons = paymentProcessor.releaseLocalFunctionHold(id, bytes);

      const milliseconds = Date.now() - functionStart;
      context.datastoreRegistry.recordStats(request.versionHash, functionName, {
        bytes,
        microgons,
        milliseconds,
      });
    }

    const boundValues = sqlParser.convertToBoundValuesMap(request.boundValues);
    const sqlQuery = new SqlQuery(sqlParser, storage, db);
    const outputs = sqlQuery.execute(inputByFunctionName, outputsByFunctionName, boundValues);

    const resultBytes = PaymentProcessor.getOfficialBytes(outputs);
    const microgons = await paymentProcessor.settle(resultBytes);
    return {
      outputs,
      latestVersionHash: registryEntry.latestVersionHash,
      metadata: {
        bytes: resultBytes,
        microgons,
        milliseconds: Date.now() - startTime,
      },
    };
  },
});
