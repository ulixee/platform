import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import IRunnerSchema, { ExtractSchemaType } from './IRunnerSchema';

export default interface IRunnerExecOptions<ISchema extends IRunnerSchema>
  extends Pick<
    IDatastoreApiTypes['Datastore.query']['args'],
    'payment' | 'affiliateId' | 'authentication'
  > {
  input?: ExtractSchemaType<ISchema['input']>;
  isFromCommandLine?: boolean;
}
