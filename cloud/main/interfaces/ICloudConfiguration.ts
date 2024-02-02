import Identity from '@ulixee/crypto/lib/Identity';
import { ServerOptions } from 'https';
import { ListenOptions } from 'node:net';

export default interface ICloudConfiguration extends ListenOptions, ServerOptions {
  networkIdentity?: Identity;
  nodeRegistryHost: string | 'self';
  hostedServicesServerOptions?: ListenOptions & ServerOptions;
  servicesSetupHost: string;
}
