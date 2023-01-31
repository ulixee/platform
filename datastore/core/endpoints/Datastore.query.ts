import { SqlParser } from '@ulixee/sql-engine';
import Datastore from '@ulixee/datastore';
import { IDatastoreApiTypes } from '@ulixee/specification/datastore';
import SqlQuery from '../lib/SqlQuery';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import DatastoreCore from '../index';
import PaymentProcessor from '../lib/PaymentProcessor';
import DatastoreVm from '../lib/DatastoreVm';
import { validateAuthentication, validateRunnerCoreVersions } from '../lib/datastoreUtils';

export default new DatastoreApiHandler('Datastore.query', {
  async handler(request, context) {
    request.boundValues ??= [];

    const startTime = Date.now();
    const datastoreVersion = await context.datastoreRegistry.getByVersionHash(request.versionHash);

    const storage = await context.datastoreRegistry.getStorage(request.versionHash);

    const db = storage.db;
    const datastore = await DatastoreVm.open(datastoreVersion.path, datastoreVersion);

    await validateAuthentication(datastore, request.payment, request.authentication);

    const sqlParser = new SqlParser(request.sql);
    if (!sqlParser.isSelect()) throw new Error('Invalid SQL command');

    sqlParser.tableNames.forEach(name => {
      const table = datastore.tables[name];
      if (!table.isPublic) throw new Error(`Table ${name} is not publicly accessible.`);
    });

    const inputByRunnerName = sqlParser.extractRunnerInputs(
      storage.schemasByRunnerName,
      request.boundValues,
    );
    const outputsByRunnerName: { [name: string]: any[] } = {};

    const paymentProcessor = new PaymentProcessor(request.payment, datastore, context);

    const runnersWithTempIds = Object.keys(inputByRunnerName).map((x, i) => {
      return {
        runnerName: x,
        id: i,
      };
    });

    await paymentProcessor.createHold(
      datastoreVersion,
      runnersWithTempIds,
      request.pricingPreferences,
    );

    for (const { runnerName, id } of runnersWithTempIds) {
      const runnerStart = Date.now();
      const runnerInput = inputByRunnerName[runnerName];
      validateRunnerCoreVersions(datastoreVersion, runnerName, context);

      const outputs = await context.workTracker.trackRun(
        runDatastoreRunner(datastore, runnerName, runnerInput, request),
      );
      outputsByRunnerName[runnerName] = outputs;

      // release the hold
      const bytes = PaymentProcessor.getOfficialBytes(outputs);
      const microgons = paymentProcessor.releaseLocalRunnerHold(id, bytes);

      const milliseconds = Date.now() - runnerStart;
      context.datastoreRegistry.recordStats(request.versionHash, runnerName, {
        bytes,
        microgons,
        milliseconds,
      });
    }

    const recordsByVirtualTableName: { [tableName: string]: Record<string, any>[] } = {};
    for (const table of sqlParser.tableNames) {
      if (storage.isVirtualTable(table)) {
        const sqlInputs = sqlParser.extractTableQuery(table, request.boundValues);
        recordsByVirtualTableName[table] = await context.workTracker.trackRun(
          runDatastorePassthroughQuery(datastore, table, sqlInputs.sql, sqlInputs.args, request),
        );
      }
    }

    const boundValues = sqlParser.convertToBoundValuesSqliteMap(request.boundValues);
    const sqlQuery = new SqlQuery(sqlParser, storage, db);
    const outputs = sqlQuery.execute(
      inputByRunnerName,
      outputsByRunnerName,
      recordsByVirtualTableName,
      boundValues,
    );

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

async function runDatastoreRunner<T>(
  datastore: Datastore,
  runnerName: string,
  runnerInput: any,
  request: IDatastoreApiTypes['Datastore.query']['args'],
): Promise<T> {
  const options = {
    input: runnerInput,
    payment: request.payment,
    authentication: request.authentication,
    affiliateId: request.affiliateId,
  };
  for (const plugin of Object.values(DatastoreCore.pluginCoresByName)) {
    if (plugin.beforeExecRunner) await plugin.beforeExecRunner(options);
  }

  return await datastore.runners[runnerName].runInternal(options);
}

async function runDatastorePassthroughQuery<T>(
  datastore: Datastore,
  tableName: string,
  sql: string,
  boundValues: any[],
  request: IDatastoreApiTypes['Datastore.query']['args'],
): Promise<T> {
  const options = {
    payment: request.payment,
    authentication: request.authentication,
  };
  return await datastore.tables[tableName].queryInternal(sql, boundValues, options);
}
