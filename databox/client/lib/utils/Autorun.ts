export async function attemptAutorun(parent: NodeJS.Module, main: NodeJS.Module, DataboxWrapper: any): Promise<void> {
  let databoxWrapper = DataboxWrapper.defaultExport;

    while (!databoxWrapper && parent) {
      if (parent === main && parent.exports?.default instanceof DataboxWrapper) {
        databoxWrapper = parent.exports?.default;
      }
      parent = parent.parent;
    }
    if (!databoxWrapper) return;
    if (databoxWrapper.disableAutorun) return;
    if (databoxWrapper.successCount || databoxWrapper.errorCount) return;
    await DataboxWrapper.run(databoxWrapper);
}

export function setupAutorunBeforeExitHook(DataboxWrapper: any): void {
  process.on('beforeExit', async () => {
    await DataboxWrapper.attemptAutorun();
    process.exit(0);
  });
}
