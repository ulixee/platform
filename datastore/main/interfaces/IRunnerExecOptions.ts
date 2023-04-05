import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import IRunnerSchema, { ExtractSchemaType } from './IRunnerSchema';

export default interface IRunnerExecOptions<ISchema extends IRunnerSchema>
  extends Partial<
    Pick<
      IDatastoreApiTypes['Datastore.query']['args'],
      'id' | 'payment' | 'affiliateId' | 'authentication'
    >
  > {
  input?: ExtractSchemaType<ISchema['input']>;
  trackMetadata?: (name: string, value: any, pluginId?: string) => void;
}
