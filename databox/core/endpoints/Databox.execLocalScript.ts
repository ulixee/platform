import DataboxApiHandler from '../lib/DataboxApiHandler';
import LocalDataboxProcess from '../lib/LocalDataboxProcess';
import { DataboxNotFoundError } from '../lib/errors';

export default new DataboxApiHandler('Databox.execLocalScript', {
  async handler(request, context) {
    const databoxProcess = new LocalDataboxProcess(request.scriptPath);
    const meta = await databoxProcess.fetchMeta();
    const functionName = request.functionName;
    const func = meta.functionsByName[functionName];
    if (!func)
      throw new DataboxNotFoundError('This Function is not available on the requested databox');

    for (const pluginName of Object.keys(func.corePlugins)) {
      if (!context.pluginCoresByName[pluginName]) {
        throw new Error(`Miner does not support required databox plugin: ${pluginName}`);
      }
    }

    const { output } = await context.workTracker.trackRun(databoxProcess.exec(request.functionName, request.input));
    await databoxProcess.close();

    return { output, latestVersionHash: null };
  },
});
