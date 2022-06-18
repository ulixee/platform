import RunnerObject from './RunnerObject';
import DataboxInternalAbstract from './abstracts/DataboxInternalAbstract';
import { IDefaultsObj } from '../interfaces/IComponents';

export default class DataboxInternal<TInput, TOutput> extends DataboxInternalAbstract<
  RunnerObject<any, any>,
  IDefaultsObj<TInput, TOutput>,
  TInput,
  TOutput
> {
  
  protected createRunnerObject(): RunnerObject<TInput, TOutput> {
    return new RunnerObject(this);
  }
}
