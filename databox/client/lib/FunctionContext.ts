import { IDataboxApiTypes } from '@ulixee/specification/databox';
import IFunctionSchema from '../interfaces/IFunctionSchema';
import FunctionInternal from './FunctionInternal';
import Databox from './Databox';
import IFunctionContext from '../interfaces/IFunctionContext';

export default class FunctionContext<
  ISchema extends IFunctionSchema,
  TFunctionInternal extends FunctionInternal<ISchema> = FunctionInternal<ISchema>,
> implements IFunctionContext<ISchema>
{
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

  public get outputs(): TFunctionInternal['outputs'] {
    return this.#functionInternal.outputs;
  }

  public get Output(): TFunctionInternal['Output'] {
    return this.#functionInternal.Output;
  }

  public get schema(): ISchema {
    return this.#functionInternal.schema;
  }
}
