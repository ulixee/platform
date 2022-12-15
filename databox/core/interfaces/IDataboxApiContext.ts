import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import IFunctionPluginCore from '@ulixee/databox/interfaces/IFunctionPluginCore';
import IDataboxCoreConfigureOptions from './IDataboxCoreConfigureOptions';
import DataboxRegistry from '../lib/DataboxRegistry';
import WorkTracker from '../lib/WorkTracker';
import SidechainClientManager from '../lib/SidechainClientManager';
import IDataboxConnectionToClient from './IDataboxConnectionToClient';

export default interface IDataboxApiContext {
  logger: IBoundLog;
  databoxRegistry: DataboxRegistry;
  workTracker: WorkTracker;
  configuration: IDataboxCoreConfigureOptions;
  pluginCoresByName: { [name: string]: IFunctionPluginCore<unknown> };
  sidechainClientManager: SidechainClientManager;
  connectionToClient?: IDataboxConnectionToClient;
}
