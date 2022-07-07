export default interface IDataboxCoreConfigureOptions {
  maxRuntimeMs?: number;
  databoxesDir?: string;
  databoxesTmpDir?: string;
  waitForDataboxCompletionOnShutdown?: boolean;
}
