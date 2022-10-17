import IDataboxExecOptions from './IDataboxExecOptions';

export default interface IDataboxPluginCore {
  name: string;
  version: string;
  nodeVmRequireWhitelist?: string[];
  onCoreStart?(): void | Promise<void>;
  onBeforeExecDatabox?(options: IDataboxExecOptions): void | Promise<void>;
  onCoreClose?(): void | Promise<void>;
}