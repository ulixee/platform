import Identity from '@ulixee/crypto/lib/Identity';

export default interface ICloudConfiguration {
  servicesSetupHost: string;
  nodeRegistryHost: string | 'self';
  cloudType: 'private' | 'public';
  kadBootstrapPeers: string[];
  kadEnabled: boolean;
  kadDbPath: string;
  networkIdentity?: Identity;
  listenOptions?: {
    publicPort?: string | number;
    publicHostname?: string;

    hostedServicesPort?: string | number;
    hostedServicesHostname?: string;
  };
}
