import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import IRunnerPluginCore from '@ulixee/datastore/interfaces/IRunnerPluginCore';
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
  pluginCoresByName: { [name: string]: IRunnerPluginCore<unknown> };
  sidechainClientManager: SidechainClientManager;
  connectionToClient?: IDatastoreConnectionToClient;
}
