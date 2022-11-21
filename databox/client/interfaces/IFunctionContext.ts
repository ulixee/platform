import IFunctionSchema, { ExtractSchemaType } from './IFunctionSchema';

export default interface IFunctionContext<ISchema extends IFunctionSchema> {
  input?: ExtractSchemaType<ISchema['input']>;
  output?: ExtractSchemaType<ISchema['output']>;
  schema?: ISchema;
}
