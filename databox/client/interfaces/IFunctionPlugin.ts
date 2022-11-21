import IFunctionExecOptions from './IFunctionExecOptions';
import IFunctionSchema from './IFunctionSchema';
import IFunctionContext from './IFunctionContext';
import FunctionInternal from '../lib/FunctionInternal';

export default interface IFunctionPlugin<
  ISchema extends IFunctionSchema,
  IOptions extends IFunctionExecOptions<ISchema> = IFunctionExecOptions<ISchema>,
  IContext extends IFunctionContext<ISchema> = IFunctionContext<ISchema>,
> {
  name: string;
  version: string;
  shouldRun?: boolean;
  onStart?(functionInternal: FunctionInternal<ISchema, IOptions>): void | Promise<void>;
  beforeRun?(context: IContext): void | Promise<void>;
  beforeClose?(): void | Promise<void>;
  onClose?(): void | Promise<void>;
}
