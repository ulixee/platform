import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import IFunctionPluginCore from '@ulixee/databox/interfaces/IFunctionPluginCore';
import IDataboxManifest from '@ulixee/specification/types/IDataboxManifest';
import IDataboxCoreConfigureOptions from './IDataboxCoreConfigureOptions';
import DataboxRegistry from '../lib/DataboxRegistry';
import WorkTracker from '../lib/WorkTracker';
import SidechainClientManager from '../lib/SidechainClientManager';

export default interface IDataboxApiContext {
  logger: IBoundLog;
  databoxRegistry: DataboxRegistry;
  workTracker: WorkTracker;
  configuration: IDataboxCoreConfigureOptions;
  pluginCoresByName: { [name: string]: IFunctionPluginCore<unknown> };
  sidechainClientManager: SidechainClientManager;
  execDataboxFunction(
    path: string,
    functionName: string,
    manifest: IDataboxManifest,
    input: any,
  ): Promise<{ output: any }>;
}
