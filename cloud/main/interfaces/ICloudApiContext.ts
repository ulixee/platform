import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import IDatastoreCoreConfigureOptions from '@ulixee/datastore-core/interfaces/IDatastoreCoreConfigureOptions';
import NodeRegistry from '../lib/NodeRegistry';
import NodeTracker from '../lib/NodeTracker';

export default interface ICloudApiContext {
  logger: IBoundLog;
  nodeTracker: NodeTracker;
  nodeRegistry: NodeRegistry;
  cloudConfiguration: ICloudConfiguration;
  datastoreConfiguration: IDatastoreCoreConfigureOptions;
  nodeAddress?: URL;
  inClusterNodeAddress?: URL;
  version: string;
}

export interface ICloudConfiguration {
  servicesSetupHost: string;
  nodeRegistryHost: string;
  cloudType: 'private' | 'public';
  dhtBootstrapPeers: string[];
}
