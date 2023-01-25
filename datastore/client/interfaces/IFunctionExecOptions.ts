import { IDatastoreApiTypes } from '@ulixee/specification/datastore';
import IFunctionSchema, { ExtractSchemaType } from './IFunctionSchema';

export default interface IFunctionExecOptions<ISchema extends IFunctionSchema>
  extends Pick<
    IDatastoreApiTypes['Datastore.query']['args'],
    'payment' | 'affiliateId' | 'authentication'
  > {
  input?: ExtractSchemaType<ISchema['input']>;
  isFromCommandLine?: boolean;
}
