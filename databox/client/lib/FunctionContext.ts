import { IDataboxApiTypes } from '@ulixee/specification/databox';
import IFunctionSchema from '../interfaces/IFunctionSchema';
import FunctionInternal from './FunctionInternal';
import Databox from './Databox';

export default class FunctionContext<
  ISchema extends IFunctionSchema,
  TFunctionInternal extends FunctionInternal<ISchema> = FunctionInternal<ISchema>,
> {
  #functionInternal: FunctionInternal<ISchema>;

  constructor(functionInternal: FunctionInternal<ISchema>, readonly databox: Databox<any, any>) {
    this.#functionInternal = functionInternal;
  }

  public get authentication(): IDataboxApiTypes['Databox.query']['args']['authentication'] {
    return this.#functionInternal.options.authentication;
  }

  public get payment(): IDataboxApiTypes['Databox.query']['args']['payment'] {
    return this.#functionInternal.options.payment;
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
