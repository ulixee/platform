import * as Path from 'path';
import Function from '../Function';
import Databox from '../Databox';

export default class Autorun {
  static defaultExport: any;
  static parentModule: NodeJS.Module;
  static mainModule: NodeJS.Module;
  static autorunBeforeExitFn: any;

  static async attemptAutorun(Module: any): Promise<void> {
    let defaultExport = this.defaultExport;
    let { parentModule } = this;

    while (!defaultExport && parentModule) {
      if (parentModule === this.mainModule && parentModule.exports?.default instanceof Module) {
        defaultExport = parentModule.exports?.default;
      }
      parentModule = parentModule.parent;
    }
    if (!defaultExport || defaultExport.disableAutorun) return;

    let func: Function;
    if (defaultExport instanceof Function) {
      func = defaultExport;
    } else if (defaultExport instanceof Databox) {
      if (Object.keys(defaultExport.functions).length === 1) {
        func = Object.values(defaultExport.functions)[0] as any;
      } else {
        const functionName = process.argv0 ?? 'default';
        func = Object.values(defaultExport.functions)[functionName];
      }

      if (!func) {
        const filePath = Path.basename(parentModule.filename);
        throw new Error(
          `Please provide a Function to run as the first argument to your script (eg: "node ./${filePath} ${
            Object.keys(defaultExport.functions)[0]
          }").`,
        );
      }
    }

    if (func.successCount || func.errorCount) return;

    try {
      await (func.constructor as typeof Function).commandLineExec(func);
    } catch (error) {
      console.error(`ERROR running ${defaultExport.constructor.name}`, error);
    }
  }

  static setupAutorunBeforeExitHook(
    AutorunModule: any,
    parentModule: NodeJS.Module,
    mainModule: NodeJS.Module,
  ): void {
    if (this.autorunBeforeExitFn) return;
    this.parentModule = parentModule;
    this.mainModule = mainModule;
    process.on('beforeExit', async () => await this.attemptAutorun(AutorunModule));
  }
}

Autorun.setupAutorunBeforeExitHook(Function, module.parent, require.main);
Autorun.setupAutorunBeforeExitHook(Databox, module.parent, require.main);
