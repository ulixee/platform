import type IExtractorRunOptions from '@ulixee/datastore/interfaces/IExtractorRunOptions';
import type IExtractorSchema from '@ulixee/datastore/interfaces/IExtractorSchema';

export default interface IExtractorPluginCore<ISchema extends IExtractorSchema = any> {
  name: string;
  version: string;
  nodeVmRequireWhitelist?: string[];
  onCoreStart?(): void | Promise<void>;
  beforeRunExtractor?(options: IExtractorRunOptions<ISchema>): void | Promise<void>;
  onCoreClose?(): void | Promise<void>;
}
