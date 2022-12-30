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
  run(
    functionInternal: FunctionInternal<ISchema, IOptions>,
    context: IContext,
    next: () => Promise<IFunctionContext<ISchema>['outputs']>,
  ): Promise<void>;
}
