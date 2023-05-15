import type IDatastoreCoreConfigureOptions from '@ulixee/datastore-core/interfaces/IDatastoreCoreConfigureOptions';
import type IExtractorRunOptions from '@ulixee/datastore/interfaces/IExtractorRunOptions';
import type IExtractorSchema from '@ulixee/datastore/interfaces/IExtractorSchema';

export default interface IExtractorPluginCore<ISchema extends IExtractorSchema = any> {
  name: string;
  version: string;
  nodeVmRequireWhitelist?: string[];
  nodeVmUseSandbox?(moduleName: string): boolean;
  onCoreStart?(coreConfiguration: IDatastoreCoreConfigureOptions): void | Promise<void>;
  beforeRunExtractor?(
    options: IExtractorRunOptions<ISchema>,
    runtime?: {
      scriptEntrypoint: string;
      functionName: string;
    },
  ): void | Promise<void>;
  onCoreClose?(): void | Promise<void>;
}
