import UlixeeConfig from '@ulixee/commons/config';
import { loadEnv, parseEnvBool, parseEnvPath } from '@ulixee/commons/lib/envUtils';
import Identity from '@ulixee/platform-utils/lib/Identity';

loadEnv(UlixeeConfig.global.directoryPath);
loadEnv(process.cwd());
loadEnv(__dirname);
const env = process.env;

if (env.ULX_NETWORK_IDENTITY_PATH)
  env.ULX_NETWORK_IDENTITY_PATH = parseEnvPath(env.ULX_NETWORK_IDENTITY_PATH);

export default {
  disableDesktopApi: parseEnvBool(env.ULX_DISABLE_DESKTOP_APIS) ?? false,
  servicesSetupHost: env.ULX_SERVICES_SETUP_HOST,
  nodeRegistryHost: env.ULX_NODE_REGISTRY_HOST,
  networkIdentity: env.ULX_NETWORK_IDENTITY_PATH
    ? Identity.loadFromFile(env.ULX_NETWORK_IDENTITY_PATH, {
        keyPassphrase: env.ULX_NETWORK_IDENTITY_PASSPHRASE,
      })
    : null,
  listenHostname: env.ULX_HOSTNAME,
  publicPort: env.ULX_PORT ?? env.PORT,
  publicHost: env.ULX_PUBLIC_HOST,
  hostedServicesPort: env.ULX_HOSTED_SERVICES_PORT,
  hostedServicesListenHostname: env.ULX_HOSTED_SERVICES_HOSTNAME,
};
