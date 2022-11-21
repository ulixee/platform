import IFunctionSchema, { ExtractSchemaType } from './IFunctionSchema';

export default interface IFunctionExecOptions<ISchema extends IFunctionSchema> {
  input?: ExtractSchemaType<ISchema['input']>;
  output?: ExtractSchemaType<ISchema['output']>;
}
