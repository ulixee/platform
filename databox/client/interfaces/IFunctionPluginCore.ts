import type IFunctionExecOptions from '@ulixee/databox/interfaces/IFunctionExecOptions';
import type IFunctionSchema from '@ulixee/databox/interfaces/IFunctionSchema';

export default interface IFunctionPluginCore<ISchema extends IFunctionSchema = any> {
  name: string;
  version: string;
  nodeVmRequireWhitelist?: string[];
  onCoreStart?(): void | Promise<void>;
  beforeExecFunction?(options: IFunctionExecOptions<ISchema>): void | Promise<void>;
  onCoreClose?(): void | Promise<void>;
}
