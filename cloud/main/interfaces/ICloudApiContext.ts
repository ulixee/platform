import { IBoundLog } from '@ulixee/commons/interfaces/ILog';

export default interface ICloudApiContext {
  logger: IBoundLog;
  cloudNodes: number;
  connectedNodes: number;
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
