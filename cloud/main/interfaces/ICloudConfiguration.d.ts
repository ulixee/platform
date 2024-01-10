/// <reference types="node" />
/// <reference types="node" />
import Identity from '@ulixee/crypto/lib/Identity';
import { ServerOptions } from 'https';
import { ListenOptions } from 'node:net';
export default interface ICloudConfiguration extends ListenOptions, ServerOptions {
    cloudType: 'private' | 'public';
    kadBootstrapPeers: string[];
    kadEnabled: boolean;
    kadDbPath: string;
    networkIdentity?: Identity;
    nodeRegistryHost: string | 'self';
    hostedServicesServerOptions?: ListenOptions & ServerOptions;
    servicesSetupHost: string;
}
