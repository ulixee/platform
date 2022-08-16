export async function attemptAutorun(
  parent: NodeJS.Module,
  main: NodeJS.Module,
  DataboxWrapper: any,
): Promise<void> {
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

let autorunBeforeExitFn: any;

export function setupAutorunBeforeExitHook(DataboxWrapper: any): void {
  if (autorunBeforeExitFn) process.off('beforeExit', autorunBeforeExitFn);
  autorunBeforeExitFn = async () => await DataboxWrapper.attemptAutorun();

  process.on('beforeExit', autorunBeforeExitFn);
}
