import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import Identity from '@ulixee/crypto/lib/Identity';
import IExtractorPluginCore from '@ulixee/datastore/interfaces/IExtractorPluginCore';
import IDatastoreCoreConfigureOptions from './IDatastoreCoreConfigureOptions';
import DatastoreRegistry from '../lib/DatastoreRegistry';
import WorkTracker from '../lib/WorkTracker';
import SidechainClientManager from '../lib/SidechainClientManager';
import IDatastoreConnectionToClient from './IDatastoreConnectionToClient';
import StorageEngineRegistry from '../lib/StorageEngineRegistry';
import DatastoreVm from '../lib/DatastoreVm';
import DatastoreApiClients from '../lib/DatastoreApiClients';
import StatsTracker from '../lib/StatsTracker';
export default interface IDatastoreApiContext {
    logger: IBoundLog;
    datastoreRegistry: DatastoreRegistry;
    storageEngineRegistry?: StorageEngineRegistry;
    workTracker: WorkTracker;
    configuration: IDatastoreCoreConfigureOptions;
    pluginCoresByName: {
        [name: string]: IExtractorPluginCore<unknown>;
    };
    sidechainClientManager: SidechainClientManager;
    connectionToClient?: IDatastoreConnectionToClient;
    cloudNodeAddress: URL;
    cloudNodeIdentity?: Identity;
    vm: DatastoreVm;
    datastoreApiClients: DatastoreApiClients;
    statsTracker: StatsTracker;
}
