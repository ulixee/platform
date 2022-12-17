import IFunctionExecOptions from './IFunctionExecOptions';
import IFunctionSchema from './IFunctionSchema';
import IFunctionContext from './IFunctionContext';
import FunctionInternal from '../lib/FunctionInternal';

export default interface IFunctionPlugin<
  ISchema extends IFunctionSchema,
  IOptions extends IFunctionExecOptions<ISchema> = IFunctionExecOptions<ISchema>,
  IContext extends IFunctionContext<ISchema> = IFunctionContext<ISchema>,
  IBeforeContext extends IFunctionContext<ISchema> = IFunctionContext<ISchema>,
  IAfterContext extends IFunctionContext<ISchema> = IFunctionContext<ISchema>,
> {
  name: string;
  version: string;
  run(
    functionInternal: FunctionInternal<ISchema, IOptions>,
    lifecycle: IFunctionLifecycle<ISchema, IContext, IBeforeContext, IAfterContext>,
    next: () => Promise<IFunctionContext<ISchema>['outputs']>,
  ): Promise<void>;
}

export interface IFunctionLifecycle<
  ISchema extends IFunctionSchema,
  IContext extends IFunctionContext<ISchema> = IFunctionContext<ISchema>,
  IBeforeContext extends IFunctionContext<ISchema> = IFunctionContext<ISchema>,
  IAfterContext extends IFunctionContext<ISchema> = IFunctionContext<ISchema>,
> {
  beforeRun: {
    context: IBeforeContext;
    isEnabled: boolean;
  };
  run: {
    context: IContext;
    isEnabled: boolean;
  };
  afterRun: {
    context: IAfterContext;
    isEnabled: boolean;
  };
}
