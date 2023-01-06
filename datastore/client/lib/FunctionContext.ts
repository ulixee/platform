import { IDatastoreApiTypes } from '@ulixee/specification/datastore';
import IFunctionSchema from '../interfaces/IFunctionSchema';
import FunctionInternal from './FunctionInternal';
import IFunctionContext from '../interfaces/IFunctionContext';
import DatastoreInternal from './DatastoreInternal';
import IDatastoreMetadata from '../interfaces/IDatastoreMetadata';

export default class FunctionContext<
  ISchema extends IFunctionSchema,
  TFunctionInternal extends FunctionInternal<ISchema> = FunctionInternal<ISchema>,
> implements IFunctionContext<ISchema>
{
  public datastoreMetadata: IDatastoreMetadata;

  public get authentication(): IDatastoreApiTypes['Datastore.query']['args']['authentication'] {
    return this.#functionInternal.options.authentication;
  }

  public get payment(): IDatastoreApiTypes['Datastore.query']['args']['payment'] {
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

  #functionInternal: FunctionInternal<ISchema>;

  constructor(functionInternal: FunctionInternal<ISchema>, datastoreInternal: DatastoreInternal) {
    this.#functionInternal = functionInternal;
    this.datastoreMetadata = datastoreInternal.metadata;
  }
}
