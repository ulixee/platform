import DataboxApiHandler from '../lib/DataboxApiHandler';
import LocalDataboxProcess from '../lib/LocalDataboxProcess';

export default new DataboxApiHandler('Databox.runLocalScript', {
  async handler(request, context) {
    const databoxProcess = new LocalDataboxProcess(request.scriptPath);
    const runtime = await databoxProcess.fetchRuntime();
    const runner = context.coreRuntimesByName[runtime.name];
    if (!runner) {
      throw new Error(`Server does not support required databox runtime: ${runtime.name}`);
    }

    const { output } = await context.workTracker.trackRun(databoxProcess.run(request.input));
    return { output, latestVersionHash: null };
  },
});
