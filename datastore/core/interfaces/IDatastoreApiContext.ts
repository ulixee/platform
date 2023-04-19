import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import IExtractorPluginCore from '@ulixee/datastore/interfaces/IExtractorPluginCore';
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
  pluginCoresByName: { [name: string]: IExtractorPluginCore<unknown> };
  sidechainClientManager: SidechainClientManager;
  connectionToClient?: IDatastoreConnectionToClient;
}
