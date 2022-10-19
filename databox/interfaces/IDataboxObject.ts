import IDataboxSchema, { ExtractSchemaType } from './IDataboxSchema';

export default interface IDataboxObject<ISchema extends IDataboxSchema> {
  input?: ExtractSchemaType<ISchema['input']>;
  output?: ExtractSchemaType<ISchema['output']>;
  schema?: ISchema;
}
