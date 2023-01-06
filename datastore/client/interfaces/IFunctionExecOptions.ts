import { IDatastoreApiTypes } from '@ulixee/specification/datastore';
import IFunctionSchema, { ExtractSchemaType } from './IFunctionSchema';

export default interface IFunctionExecOptions<ISchema extends IFunctionSchema> {
  input?: ExtractSchemaType<ISchema['input']>;
  output?: ExtractSchemaType<ISchema['output']>;
  payment?: IDatastoreApiTypes['Datastore.query']['args']['payment'],
  authentication?: IDatastoreApiTypes['Datastore.query']['args']['authentication'],
  isFromCommandLine?: boolean;
}
