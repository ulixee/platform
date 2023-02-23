import type IRunnerExecOptions from '@ulixee/datastore/interfaces/IRunnerExecOptions';
import type IRunnerSchema from '@ulixee/datastore/interfaces/IRunnerSchema';

export default interface IRunnerPluginCore<ISchema extends IRunnerSchema = any> {
  name: string;
  version: string;
  nodeVmRequireWhitelist?: string[];
  onCoreStart?(): void | Promise<void>;
  beforeExecRunner?(options: IRunnerExecOptions<ISchema>): void | Promise<void>;
  onCoreClose?(): void | Promise<void>;
}
