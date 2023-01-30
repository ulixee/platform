import { SqlParser } from '@ulixee/sql-engine';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import LocalDatastoreProcess from '../lib/LocalDatastoreProcess';
import { DatastoreNotFoundError } from '../lib/errors';
import DatastoreStorage from '../lib/DatastoreStorage';
import SqlQuery from '../lib/SqlQuery';

export default new DatastoreApiHandler('Datastore.queryLocalScript', {
  async handler(request, context) {
    const datastoreProcess = new LocalDatastoreProcess(request.scriptPath);
    const meta = await datastoreProcess.fetchMeta();
    const storage = new DatastoreStorage();

    const db = storage.db;
    const sqlParser = new SqlParser(request.sql);
    if (!sqlParser.isSelect()) throw new Error('Invalid SQL command');

    const schemas = Object.keys(meta.runnersByName).reduce((obj, k) => {
      return Object.assign(obj, { [k]: meta.runnersByName[k].schema.input });
    }, {});
    const inputByRunnerName = sqlParser.extractRunnerInputs(schemas, request.boundValues);
    const outputByRunnerName: { [name: string]: any[] } = {};

    for (const runnerName of Object.keys(inputByRunnerName)) {
      const input = inputByRunnerName[runnerName];
      const runner = meta.runnersByName[runnerName];
      if (!runner)
        throw new DatastoreNotFoundError(
          'This Runner is not available on the requested datastore',
        );

      for (const pluginName of Object.keys(runner.corePlugins)) {
        if (!context.pluginCoresByName[pluginName]) {
          throw new Error(`Miner does not support required datastore plugin: ${pluginName}`);
        }
      }

      outputByRunnerName[runnerName] = await context.workTracker.trackRun(
        datastoreProcess.run(runnerName, input).then(x => x),
      );
    }

    const boundValues = sqlParser.convertToBoundValuesSqliteMap(request.boundValues);
    const sqlQuery = new SqlQuery(sqlParser, storage, db);
    const records = sqlQuery.execute(inputByRunnerName, outputByRunnerName, {}, boundValues);
    await datastoreProcess.close();

    return { outputs: records, latestVersionHash: null };
  },
});
