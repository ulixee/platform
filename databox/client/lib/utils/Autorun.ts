export default class Autorun {
  static defaultExport: any;
  static parentModule: NodeJS.Module;
  static mainModule: NodeJS.Module;
  static autorunBeforeExitFn: any;

  static async attemptAutorun(Databox: any): Promise<void> {
    let databox = this.defaultExport;
    let { parentModule } = this;

    while (!databox && parentModule) {
      if (parentModule === this.mainModule && parentModule.exports?.default instanceof Databox) {
        databox = parentModule.exports?.default;
      }
      parentModule = parentModule.parent;
    }
    if (!databox) return;
    if (databox.disableAutorun) return;
    if (databox.successCount || databox.errorCount) return;

    await databox.constructor.commandLineExec(databox);
  }

  static setupAutorunBeforeExitHook(
    DataboxBase: any,
    parentModule: NodeJS.Module,
    mainModule: NodeJS.Module,
  ): void {
    if (this.autorunBeforeExitFn) return;
    this.parentModule = parentModule;
    this.mainModule = mainModule;
    process.on('beforeExit', async () => await this.attemptAutorun(DataboxBase));
  }
}
