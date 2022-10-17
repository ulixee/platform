import IDataboxSchema, { ExtractSchemaType } from '@ulixee/databox-interfaces/IDataboxSchema';
import IDataboxObject from '@ulixee/databox-interfaces/IDataboxObject';

export default interface IComponentsBase<
  ISchema extends IDataboxSchema,
  TDataboxObject extends IDataboxObject<ISchema>,
  TDefaultsObj extends IDefaultsObj<ISchema>,
  > {
  run(databox: TDataboxObject): void | Promise<void>;
  defaults?: TDefaultsObj;
  schema?: ISchema;
}

export interface IDefaultsObj<ISchema extends IDataboxSchema> {
  input?: Partial<ExtractSchemaType<ISchema['input']>>;
  output?: Partial<ExtractSchemaType<ISchema['output']>>;
}
