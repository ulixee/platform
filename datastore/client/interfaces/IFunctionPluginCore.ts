import type IFunctionExecOptions from '@ulixee/datastore/interfaces/IFunctionExecOptions';
import type IFunctionSchema from '@ulixee/datastore/interfaces/IFunctionSchema';

export default interface IFunctionPluginCore<ISchema extends IFunctionSchema = any> {
  name: string;
  version: string;
  nodeVmRequireWhitelist?: string[];
  onCoreStart?(): void | Promise<void>;
  beforeExecFunction?(options: IFunctionExecOptions<ISchema>): void | Promise<void>;
  onCoreClose?(): void | Promise<void>;
}
