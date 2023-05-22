import Identity from '@ulixee/crypto/lib/Identity';

export default interface ICloudConfiguration {
  servicesSetupHost: string;
  nodeRegistryHost: string | 'self';
  cloudType: 'private' | 'public';
  dhtBootstrapPeers: string[];
  networkIdentity?: Identity;
  listenOptions?: {
    publicPort?: string | number;
    peerPort?: string | number;
    publicHostname?: string;

    hostedServicesPort?: string | number;
    hostedServicesHostname?: string;

  };
}
