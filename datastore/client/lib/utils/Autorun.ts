import * as Path from 'path';
import Function from '../Function';
import Datastore from '../Datastore';

export default class Autorun {
  static mainModuleExports: NodeJS.Module['exports'];
  static isEnabled = true;

  static async attemptAutorun(): Promise<void> {
    if (!this.mainModuleExports || !this.isEnabled) return;

    const functionName = process.argv0 ?? 'default';
    const filePath = Path.relative(process.cwd(), process.argv[1]);

    let matchingModule = this.mainModuleExports.default;

    if (functionName && this.mainModuleExports[functionName]) {
      matchingModule = this.mainModuleExports[functionName];
    } else {
      // see if only single exported Function/Datastore
      const allExports = Object.values(this.mainModuleExports);

      const exportedDatastores = allExports.filter(x => x instanceof Datastore);
      if (exportedDatastores.length === 1) matchingModule = exportedDatastores[0];
      else {
        const exportedFunctions = allExports.filter(x => x instanceof Function);
        if (exportedFunctions.length === 1) matchingModule = exportedFunctions[0];
      }
    }

    let func: Function;
    if (matchingModule) {
      if (matchingModule.disableAutorun) return;
      if (matchingModule instanceof Function) {
        func = matchingModule;
      } else if (matchingModule instanceof Datastore) {
        func = matchingModule.functions[functionName] ?? matchingModule.crawlers[functionName];
      }
    }

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

    try {
      await (func.constructor as typeof Function).commandLineExec(func);
    } catch (error) {
      console.error(`ERROR running ${func.name ?? functionName}`, error);
    }
  }

  static setupAutorunBeforeExitHook(mainModule: NodeJS.Module): void {
    if (!mainModule) return;
    this.mainModuleExports = mainModule.exports;
    process.on('beforeExit', async () => await this.attemptAutorun());
  }
}
