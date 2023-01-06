import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import IFunctionPluginCore from '@ulixee/datastore/interfaces/IFunctionPluginCore';
import IDatastoreCoreConfigureOptions from './IDatastoreCoreConfigureOptions';
import DatastoreRegistry from '../lib/DatastoreRegistry';
import WorkTracker from '../lib/WorkTracker';
import SidechainClientManager from '../lib/SidechainClientManager';
import IDatastoreConnectionToClient from './IDatastoreConnectionToClient';

export default interface IDatastoreApiContext {
  logger: IBoundLog;
  datastoreRegistry: DatastoreRegistry;
  workTracker: WorkTracker;
  configuration: IDatastoreCoreConfigureOptions;
  pluginCoresByName: { [name: string]: IFunctionPluginCore<unknown> };
  sidechainClientManager: SidechainClientManager;
  connectionToClient?: IDatastoreConnectionToClient;
}
