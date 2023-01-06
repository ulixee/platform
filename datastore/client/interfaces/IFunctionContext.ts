import IFunctionSchema, { ExtractSchemaType } from './IFunctionSchema';
import { IOutputClass } from '../lib/Output';
import IDatastoreMetadata from './IDatastoreMetadata';

export default interface IFunctionContext<TSchema extends IFunctionSchema> {
  input?: ExtractSchemaType<TSchema['input']>;
  readonly outputs?: ExtractSchemaType<TSchema['output']>[];
  readonly Output?: IOutputClass<ExtractSchemaType<TSchema['output']>>;
  schema?: TSchema;
  datastoreMetadata: IDatastoreMetadata;
}
