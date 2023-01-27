import * as Path from 'path';
import { Console } from 'console';
import Function from '../Function';
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

    let functionName = process.argv[2];
    if (!functionName || functionName.startsWith('-')) functionName = 'default';
    const filePath = Path.relative(process.cwd(), process.argv[1]);

    let matchingModule = this.mainModuleExports.default;

    if (functionName && this.mainModuleExports[functionName]) {
      matchingModule = this.mainModuleExports[functionName];
    } else {
      // see if only single exported Function/Datastore
      const allExports = Object.entries(this.mainModuleExports);

      const exportedDatastores = allExports.filter(x => x[1] instanceof Datastore);
      if (exportedDatastores.length === 1) matchingModule = exportedDatastores[0][1];
      else {
        const exportedFunctions = allExports.filter(x => x[1] instanceof Function);
        if (exportedFunctions.length === 1) {
          functionName = exportedFunctions[0][0];
          matchingModule = exportedFunctions[0][1];
        }
      }
    }

    let func: Function;
    if (matchingModule) {
      if (matchingModule instanceof Function) {
        func = matchingModule;
      } else if (matchingModule instanceof Datastore) {
        func = matchingModule.functions[functionName] ?? matchingModule.crawlers[functionName];
      }
      if (func.disableAutorun || matchingModule.disableAutorun) return;
    }

    try {
      if (!func) {
        const firstExport = Object.keys(this.mainModuleExports)[0];
        const example = `(eg: "node ${filePath} ${firstExport}")`;
        if (!this.mainModuleExports.default) {
          throw new Error(
            `The module at ${filePath} does not have a default export. Specify the export to run using the first argument to your script ${example}.`,
          );
        }
        throw new Error(
          `Please provide a Function to run as the first argument to your script ${example}.`,
        );
      }

      if (func.successCount || func.errorCount) return;

      await (func.constructor as typeof Function).commandLineExec(func);
    } catch (error) {
      errorConsole.error(`ERROR running ${functionName ?? func?.name ?? 'function'}`, error);
    }
  }

  static setupAutorunBeforeExitHook(mainModule: NodeJS.Module): void {
    if (!mainModule) return;
    this.mainModuleExports = mainModule.exports;
    process.on('beforeExit', async () => await this.attemptAutorun());
  }
}
