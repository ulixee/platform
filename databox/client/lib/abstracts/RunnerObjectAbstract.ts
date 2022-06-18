import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import IBasicInput from '@ulixee/databox-interfaces/IBasicInput';
import ISchema from '../../interfaces/ISchema';
import DataboxInternalAbstract from './DataboxInternalAbstract';

export default abstract class RunnerObjectAbstract<
    TInput extends IBasicInput,
    TOutput,
  > extends TypedEventEmitter<{ close: void; error: Error }> {
  protected readonly databoxInternal: DataboxInternalAbstract<any, any>;

  constructor(databoxInternal: DataboxInternalAbstract<any, any>) {
    super();
    this.databoxInternal = databoxInternal;
  }

  public get action(): string {
    return this.databoxInternal.action;
  }

  public get input(): TInput {
    return this.databoxInternal.input as TInput;
  }

  public get output(): TOutput {
    return this.databoxInternal.output;
  }

  public set output(value: any | any[]) {
    this.databoxInternal.output = value;
  }

  public get schema(): ISchema {
    return this.databoxInternal.schema;
  }
}
