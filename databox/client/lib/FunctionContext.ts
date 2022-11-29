import IFunctionSchema from '../interfaces/IFunctionSchema';
import FunctionInternal from './FunctionInternal';

export default class FunctionContext<
  ISchema extends IFunctionSchema,
  TFunctionInternal extends FunctionInternal<ISchema> = FunctionInternal<ISchema>,
> {
  #functionInternal: FunctionInternal<ISchema>;

  constructor(functionInternal: FunctionInternal<ISchema>) {
    this.#functionInternal = functionInternal;
  }

  public get input(): TFunctionInternal['input'] {
    return this.#functionInternal.input;
  }

  public get output(): TFunctionInternal['output'] {
    return this.#functionInternal.output;
  }

  public set output(value: TFunctionInternal['output']) {
    this.#functionInternal.output = value;
  }

  public get schema(): ISchema {
    return this.#functionInternal.schema;
  }
}
