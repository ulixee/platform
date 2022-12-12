import IFunctionSchema, { ExtractSchemaType } from './IFunctionSchema';
import Databox from '../lib/Databox';

export default interface IFunctionContext<ISchema extends IFunctionSchema> {
  input?: ExtractSchemaType<ISchema['input']>;
  output?: ExtractSchemaType<ISchema['output']>;
  schema?: ISchema;
  databox: Databox<any, any>;
}
