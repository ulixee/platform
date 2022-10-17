import DataboxApiHandler from '../lib/DataboxApiHandler';
import LocalDataboxProcess from '../lib/LocalDataboxProcess';

export default new DataboxApiHandler('Databox.execLocalScript', {
  async handler(request, context) {
    const databoxProcess = new LocalDataboxProcess(request.scriptPath);
    const meta = await databoxProcess.fetchMeta();
    for (const pluginName of Object.keys(meta.corePlugins)) {
      if (!context.pluginCoresByName[pluginName]) {
        throw new Error(`Server does not support required databox plugin: ${pluginName}`);
      }
    }

    const { output } = await context.workTracker.trackRun(databoxProcess.exec(request.input));
    return { output, latestVersionHash: null };
  },
});
