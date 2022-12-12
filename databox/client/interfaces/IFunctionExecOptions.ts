import { IDataboxApiTypes } from '@ulixee/specification/databox';
import IFunctionSchema, { ExtractSchemaType } from './IFunctionSchema';

export default interface IFunctionExecOptions<ISchema extends IFunctionSchema> {
  input?: ExtractSchemaType<ISchema['input']>;
  output?: ExtractSchemaType<ISchema['output']>;
  payment?: IDataboxApiTypes['Databox.query']['args']['payment'],
  authentication?: IDataboxApiTypes['Databox.query']['args']['authentication'],
  isFromCommandLine?: boolean;
}
