import IDataboxExecOptions from './IDataboxExecOptions';
import IDataboxSchema from './IDataboxSchema';

export default interface IDataboxPluginCore<ISchema extends IDataboxSchema = any> {
  name: string;
  version: string;
  nodeVmRequireWhitelist?: string[];
  onCoreStart?(): void | Promise<void>;
  onBeforeExecDatabox?(options: IDataboxExecOptions<ISchema>): void | Promise<void>;
  onCoreClose?(): void | Promise<void>;
}
