import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import IExtractorSchema, { ExtractSchemaType } from './IExtractorSchema';
export default interface IExtractorRunOptions<ISchema extends IExtractorSchema> extends Partial<Pick<IDatastoreApiTypes['Datastore.query']['args'], 'id' | 'payment' | 'affiliateId' | 'authentication' | 'queryId' | 'version'>> {
    input?: ExtractSchemaType<ISchema['input']>;
    trackMetadata?: (name: string, value: any, pluginId?: string) => void;
}
