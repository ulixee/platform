import IFunctionSchema, { ExtractSchemaType } from './IFunctionSchema';
import { IOutputClass } from '../lib/Output';
import IDataboxMetadata from './IDataboxMetadata';

export default interface IFunctionContext<TSchema extends IFunctionSchema> {
  input?: ExtractSchemaType<TSchema['input']>;
  readonly outputs?: ExtractSchemaType<TSchema['output']>[];
  readonly Output?: IOutputClass<ExtractSchemaType<TSchema['output']>>;
  schema?: TSchema;
  databoxMetadata: IDataboxMetadata;
}
