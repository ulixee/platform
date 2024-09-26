import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import IDatastoreHostLookup from '@ulixee/datastore/interfaces/IDatastoreHostLookup';
import IExtractorPluginCore from '@ulixee/datastore/interfaces/IExtractorPluginCore';
import IPaymentService from '@ulixee/datastore/interfaces/IPaymentService';
import DatastoreApiClients from '@ulixee/datastore/lib/DatastoreApiClients';
import Identity from '@ulixee/platform-utils/lib/Identity';
import IMicropaymentChannelSpendTracker from '@ulixee/datastore-core/interfaces/IMicropaymentChannelSpendTracker';
import { IDatastorePaymentRecipient } from '@ulixee/platform-specification/types/IDatastoreManifest';
import DatastoreRegistry from '../lib/DatastoreRegistry';
import DatastoreVm from '../lib/DatastoreVm';
import StatsTracker from '../lib/StatsTracker';
import StorageEngineRegistry from '../lib/StorageEngineRegistry';
import WorkTracker from '../lib/WorkTracker';
import IDatastoreConnectionToClient from './IDatastoreConnectionToClient';
import IDatastoreCoreConfigureOptions from './IDatastoreCoreConfigureOptions';

export default interface IDatastoreApiContext {
  logger: IBoundLog;
  datastoreRegistry: DatastoreRegistry;
  micropaymentChannelSpendTracker: IMicropaymentChannelSpendTracker;
  paymentInfo: Promise<IDatastorePaymentRecipient | undefined>;
  upstreamDatastorePaymentService: IPaymentService;
  datastoreLookup: IDatastoreHostLookup;
  storageEngineRegistry?: StorageEngineRegistry;
  workTracker: WorkTracker;
  configuration: IDatastoreCoreConfigureOptions;
  pluginCoresByName: { [name: string]: IExtractorPluginCore<unknown> };
  connectionToClient?: IDatastoreConnectionToClient;
  cloudNodeAddress: URL;
  cloudNodeIdentity?: Identity;
  vm: DatastoreVm;
  datastoreApiClients: DatastoreApiClients;
  statsTracker: StatsTracker;
}
