import * as Path from 'path';
import { Console } from 'console';
import Runner from '../Runner';
import Datastore from '../Datastore';

const errorConsole = new Console({
  stdout: process.stdout,
  stderr: process.stderr,
  inspectOptions: { depth: null },
  colorMode: 'auto',
});

export default class Autorun {
  static mainModuleExports: NodeJS.Module['exports'];
  static isEnabled = true;

  static async attemptAutorun(): Promise<void> {
    if (!this.mainModuleExports || !this.isEnabled) return;

    let runnerName = process.argv[2];
    if (!runnerName || runnerName.startsWith('-')) runnerName = 'default';
    const filePath = Path.relative(process.cwd(), process.argv[1]);

    let matchingModule = this.mainModuleExports.default;

    if (runnerName && this.mainModuleExports[runnerName]) {
      matchingModule = this.mainModuleExports[runnerName];
    } else {
      // see if only single exported Runner/Datastore
      const allExports = Object.entries(this.mainModuleExports);

      const exportedDatastores = allExports.filter(x => x[1] instanceof Datastore);
      if (exportedDatastores.length === 1) matchingModule = exportedDatastores[0][1];
      else {
        const exportedRunners = allExports.filter(x => x[1] instanceof Runner);
        if (exportedRunners.length === 1) {
          runnerName = exportedRunners[0][0];
          matchingModule = exportedRunners[0][1];
        }
      }
    }

    let runner: Runner;
    if (matchingModule) {
      if (matchingModule instanceof Runner) {
        runner = matchingModule;
      } else if (matchingModule instanceof Datastore) {
        runner = matchingModule.runners[runnerName] ?? matchingModule.crawlers[runnerName];
      }
      if (runner.disableAutorun || matchingModule.disableAutorun) return;
    }

    try {
      if (!runner) {
        const firstExport = Object.keys(this.mainModuleExports)[0];
        const example = `(eg: "node ${filePath} ${firstExport}")`;
        if (!this.mainModuleExports.default) {
          throw new Error(
            `The module at ${filePath} does not have a default export. Specify the export to run using the first argument to your script ${example}.`,
          );
        }
        throw new Error(
          `Please provide a Runner to run as the first argument to your script ${example}.`,
        );
      }

      if (runner.successCount || runner.errorCount) return;

      await (runner.constructor as typeof Runner).commandLineExec(runner);
    } catch (error) {
      if (!error[Symbol.for('Runner.hasLogged')]) {
        errorConsole.error(`ERROR running ${runnerName ?? runner?.name ?? 'runner'}`, error);
      }
    }
  }

  static setupAutorunBeforeExitHook(mainModule: NodeJS.Module): void {
    if (!mainModule) return;
    this.mainModuleExports = mainModule.exports;
    process.on('beforeExit', async () => await this.attemptAutorun());
  }
}
