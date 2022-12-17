import IFunctionSchema, { ExtractSchemaType } from './IFunctionSchema';
import Databox from '../lib/Databox';
import { IOutputClass } from '../lib/Output';

export default interface IFunctionContext<
  ISchema extends IFunctionSchema,
  TOutput = ExtractSchemaType<ISchema['output']>,
> {
  input?: ExtractSchemaType<ISchema['input']>;
  readonly outputs?: TOutput[];
  readonly Output?: IOutputClass<TOutput>;
  schema?: ISchema;
  databox: Databox<any, any>;
}
