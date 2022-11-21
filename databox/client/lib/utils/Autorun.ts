import Function from '../Function';

export default class Autorun {
  static defaultExport: Function<any>;
  static parentModule: NodeJS.Module;
  static mainModule: NodeJS.Module;
  static autorunBeforeExitFn: any;

  static async attemptAutorun(FunctionModule: any): Promise<void> {
    let func = this.defaultExport;
    let { parentModule } = this;

    while (!func && parentModule) {
      if (
        parentModule === this.mainModule &&
        parentModule.exports?.default instanceof FunctionModule
      ) {
        func = parentModule.exports?.default;
      }
      parentModule = parentModule.parent;
    }
    if (!func) return;
    if (func.disableAutorun) return;
    if (func.successCount || func.errorCount) return;

    await (func.constructor as typeof Function).commandLineExec(func);
  }

  static setupAutorunBeforeExitHook(
    FunctionModule: typeof Function,
    parentModule: NodeJS.Module,
    mainModule: NodeJS.Module,
  ): void {
    if (this.autorunBeforeExitFn) return;
    this.parentModule = parentModule;
    this.mainModule = mainModule;
    process.on('beforeExit', async () => await this.attemptAutorun(FunctionModule));
  }
}
