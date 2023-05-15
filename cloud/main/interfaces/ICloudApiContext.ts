import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import NodeTracker from '../lib/NodeTracker';
import NodeRegistry from '../lib/NodeRegistry';

export default interface ICloudApiContext {
  logger: IBoundLog;
  nodeTracker: NodeTracker;
  nodeRegistry: NodeRegistry;
  cloudConfiguration: ICloudConfiguration;
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
