import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import { SqlParser } from '@ulixee/sql-engine';
import SqlQuery from '../lib/SqlQuery';
import DataboxApiHandler from '../lib/DataboxApiHandler';
import DataboxCore from '../index';
import PaymentProcessor from '../lib/PaymentProcessor';
import DataboxStorage from '../lib/DataboxStorage';
import DataboxVm from '../lib/DataboxVm';
import {
  execDataboxFunction,
  validateAuthentication,
  validateFunctionCoreVersions,
} from '../lib/databoxUtils';

export default new DataboxApiHandler('Databox.query', {
  async handler(request, context) {
    if (DataboxCore.isClosing) {
      throw new CanceledPromiseError('Miner shutting down. Not accepting new work.');
    }
    await DataboxCore.start();
    request.boundValues ??= [];

    const startTime = Date.now();
    const { registryEntry, manifest } = await context.databoxRegistry.loadVersion(
      request.versionHash,
    );

    let storage: DataboxStorage;
    if (request.versionHash) {
      const storagePath = context.databoxRegistry.getStoragePath(request.versionHash);
      storage = new DataboxStorage(storagePath);
    } else {
      context.connectionToClient.databoxStorage ??= new DataboxStorage();
      storage = context.connectionToClient?.databoxStorage;
    }

    const db = storage.db;
    const databox = await DataboxVm.open(registryEntry.path, manifest);

    await validateAuthentication(databox, request.payment, request.authentication);

    const sqlParser = new SqlParser(request.sql);
    if (!sqlParser.isSelect()) throw new Error('Invalid SQL command');

    sqlParser.functionNames.forEach(functionName => {
      const schema = databox.functions[functionName].schema || {};
      storage.addFunctionSchema(functionName, schema);
    });

    sqlParser.tableNames.forEach(functionName => {
      const schema = databox.tables[functionName].schema || {};
      storage.addTableSchema(functionName, schema);
    });

    const inputByFunctionName = sqlParser.extractFunctionInputs(
      storage.schemasByFunctionName,
      request.boundValues,
    );
    const outputByFunctionName: { [name: string]: any[] } = {};

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

      const { output } = await context.workTracker.trackRun(
        execDataboxFunction(databox, manifest, functionName, functionInput, request),
      );
      outputByFunctionName[functionName] = Array.isArray(output) ? output : [output];

      // release the hold
      const bytes = PaymentProcessor.getOfficialBytes(output);
      const microgons = paymentProcessor.releaseLocalFunctionHold(id, bytes);

      const millis = Date.now() - functionStart;
      context.databoxRegistry.recordStats(request.versionHash, functionName, {
        bytes,
        microgons,
        millis,
      });
    }

    const boundValues = sqlParser.convertToBoundValuesMap(request.boundValues);
    const sqlQuery = new SqlQuery(sqlParser, storage, db);
    const output = sqlQuery.execute(inputByFunctionName, outputByFunctionName, boundValues);

    const resultBytes = PaymentProcessor.getOfficialBytes(output);
    const microgons = await paymentProcessor.settle(resultBytes);
    return {
      output,
      latestVersionHash: registryEntry.latestVersionHash,
      metadata: {
        bytes: resultBytes,
        microgons,
        milliseconds: Date.now() - startTime,
      },
    };
  },
});
