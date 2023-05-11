import { loadEnv, parseEnvBool, parseEnvList, parseEnvPath } from '@ulixee/commons/lib/envUtils';
import Identity from '@ulixee/crypto/lib/Identity';

loadEnv(process.cwd());
loadEnv(__dirname);
const env = process.env;

if (env.ULX_P2P_IDENTITY_PATH) env.ULX_P2P_IDENTITY_PATH = parseEnvPath(env.ULX_P2P_IDENTITY_PATH);

export default {
  disableChromeAlive: env.NODE_ENV === 'test' || parseEnvBool(env.ULX_DISABLE_CHROMEALIVE),
  servicesSetupHost: env.ULX_SERVICES_SETUP_HOST,
  nodeRegistryHost: env.ULX_NODE_REGISTRY_HOST,
  cloudType: env.ULX_CLOUD_TYPE === 'public' ? 'public' : 'private',
  dhtBootstrapPeers: parseEnvList(env.ULX_BOOTSTRAP_PEERS),
  p2pIdentity: env.ULX_P2P_IDENTITY_PATH
    ? Identity.loadFromFile(env.ULX_P2P_IDENTITY_PATH, {
        keyPassphrase: env.ULX_P2P_IDENTITY_PASSPHRASE,
      })
    : null,
};
