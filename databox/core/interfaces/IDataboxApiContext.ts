import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import IDataboxCoreConfigureOptions from '@ulixee/databox-interfaces/IDataboxCoreConfigureOptions';
import IDataboxPluginCore from '@ulixee/databox-interfaces/IDataboxPluginCore';
import IDataboxManifest from '@ulixee/specification/types/IDataboxManifest';
import DataboxRegistry from '../lib/DataboxRegistry';
import WorkTracker from '../lib/WorkTracker';
import SidechainClientManager from '../lib/SidechainClientManager';

export default interface IDataboxApiContext {
  logger: IBoundLog;
  databoxRegistry: DataboxRegistry;
  workTracker: WorkTracker;
  configuration: IDataboxCoreConfigureOptions;
  pluginCoresByName: { [name: string]: IDataboxPluginCore<unknown> };
  sidechainClientManager: SidechainClientManager;
  execDatabox(path: string, manifest: IDataboxManifest, input: any): Promise<{ output: any }>;
}
