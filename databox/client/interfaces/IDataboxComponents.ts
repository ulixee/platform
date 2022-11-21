import IFunctionContext from './IFunctionContext';
import Function from '../lib/Function';
import IFunctionComponents from './IFunctionComponents';

export default interface IDataboxComponents<
  Fns extends Function<any>,
  TContext extends IFunctionComponents<any, IFunctionContext<any>>,
> {
  functions: Record<string, Fns | TContext | TContext['run']>;
}
