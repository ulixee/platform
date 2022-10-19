import IDataboxSchema, { ExtractSchemaType } from './IDataboxSchema';

export default interface IDataboxExecOptions<ISchema extends IDataboxSchema> {
  input?: ExtractSchemaType<ISchema['input']>;
  output?: ExtractSchemaType<ISchema['output']>;
}
