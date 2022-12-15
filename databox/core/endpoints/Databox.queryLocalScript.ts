import { SqlParser } from '@ulixee/sql-engine';
import DataboxApiHandler from '../lib/DataboxApiHandler';
import LocalDataboxProcess from '../lib/LocalDataboxProcess';
import { DataboxNotFoundError } from '../lib/errors';
import DataboxStorage from '../lib/DataboxStorage';
import SqlQuery from '../lib/SqlQuery';

export default new DataboxApiHandler('Databox.queryLocalScript', {
  async handler(request, context) {
    const databoxProcess = new LocalDataboxProcess(request.scriptPath);
    const meta = await databoxProcess.fetchMeta();
    const storage = new DataboxStorage();

    const db = storage.db;
    const sqlParser = new SqlParser(request.sql);
    const schemas = Object.keys(meta.functionsByName).reduce((obj, k) => {
      return Object.assign(obj, { [k]: meta.functionsByName[k].schema.input });
    }, {});
    const inputByFunctionName = sqlParser.extractFunctionInputs(schemas, request.boundValues);
    const outputByFunctionName: { [name: string]: any[] } = {};

    for (const functionName of Object.keys(inputByFunctionName)) {
      const input = inputByFunctionName[functionName];
      const func = meta.functionsByName[functionName];
      if (!func)
        throw new DataboxNotFoundError('This Function is not available on the requested databox');

      for (const pluginName of Object.keys(func.corePlugins)) {
        if (!context.pluginCoresByName[pluginName]) {
          throw new Error(`Miner does not support required databox plugin: ${pluginName}`);
        }
      }

      const { output } = await context.workTracker.trackRun(databoxProcess.exec(functionName, input));
      outputByFunctionName[functionName] = Array.isArray(output) ? output : [output];
    }

    if (!sqlParser.isSelect()) throw new Error('Invalid SQL command');

    const boundValues = sqlParser.convertToBoundValuesMap(request.boundValues);
    const sqlQuery = new SqlQuery(sqlParser, storage, db); 
    const records = sqlQuery.execute(inputByFunctionName, outputByFunctionName, boundValues);
    await databoxProcess.close();

    return { output: records, latestVersionHash: null };
  },
});
