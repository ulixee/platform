/// <reference types="node" />
/// <reference types="node" />
import Identity from '@ulixee/platform-utils/lib/Identity';
import { ServerOptions } from 'https';
import { ListenOptions } from 'node:net';
export default interface ICloudConfiguration extends ListenOptions, ServerOptions {
    networkIdentity?: Identity;
    nodeRegistryHost: string | 'self';
    hostedServicesServerOptions?: ListenOptions & ServerOptions;
    servicesSetupHost: string;
}
