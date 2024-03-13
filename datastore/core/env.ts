import { loadEnv, parseEnvBool, parseEnvInt, parseEnvPath } from '@ulixee/commons/lib/envUtils';
import { addressValidation, identityValidation } from '@ulixee/platform-specification/types';
import { ILocalchainConfig } from './lib/LocalchainWithSync';

loadEnv(process.cwd());
loadEnv(__dirname);
const env = process.env;
if (env.ULX_DATASTORE_DIR) env.ULX_DATASTORE_DIR = parseEnvPath(env.ULX_DATASTORE_DIR);
if (env.ULX_QUERY_HERO_SESSIONS_DIR)
  env.ULX_QUERY_HERO_SESSIONS_DIR = parseEnvPath(env.ULX_QUERY_HERO_SESSIONS_DIR);

export default {
  serverEnvironment: env.ULX_SERVER_ENVIRONMENT,
  datastoresDir: env.ULX_DATASTORE_DIR,
  queryHeroSessionsDir: env.ULX_QUERY_HERO_SESSIONS_DIR,
  replayRegistryHost: env.ULX_REPLAY_REGISTRY_HOST,
  escrowSpendTrackingHost: env.ULX_ESCROW_SPEND_TRACKING_HOST,
  paymentServiceHost: env.ULX_PAYMENT_SERVICE_HOST,
  datastoreLookupHost: env.ULX_DATASTORE_LOOKUP_SERVICE_HOST,
  enableSqliteWalMode: env.ULX_ENABLE_SQLITE_WAL,
  // list of identities who can upload to this Cloud [@ulixee/platform-utils/lib/Identity.bech32]
  cloudAdminIdentities: parseIdentities(env.ULX_CLOUD_ADMIN_IDENTITIES, 'Admin Identities'),
  datastoresMustHaveOwnAdminIdentity: parseEnvBool(env.ULX_DATASTORES_MUST_HAVE_OWN_ADMIN) ?? false,

  localchainConfig: getLocalchainConfig(),

  enableGlobalConfigs: parseEnvBool(env.ULX_ENABLE_GLOBAL_CONFIG) ?? true,
  statsTrackerHost: env.ULX_DATASTORE_STATS_HOST,
  datastoreRegistryHost: env.ULX_DATASTORE_REGISTRY_HOST,
  storageEngineHost: env.ULX_STORAGE_ENGINE_HOST,
};

function getLocalchainConfig(): ILocalchainConfig | undefined {
  if (!env.ULX_LOCALCHAIN_PATH && !env.ULX_MAINCHAIN_URL) return;
  let keystorePassword: Buffer | undefined;
  if (env.ULX_LOCALCHAIN_PASSWORD) {
    keystorePassword = Buffer.from(env.ULX_LOCALCHAIN_PASSWORD, 'utf8');
    delete process.env.ULX_LOCALCHAIN_PASSWORD;
  }
  return <ILocalchainConfig>{
    localchainPath: parseEnvPath(env.ULX_LOCALCHAIN_PATH),
    mainchainUrl: env.ULX_MAINCHAIN_URL,
    votesAddress: parseAddress(env.ULX_VOTES_ADDRESS, 'Votes Address'),
    notaryId: parseEnvInt(env.NOTARY_ID),
    keystorePassword: {
      interactiveCli: parseEnvBool(env.ULX_LOCALCHAIN_PASSWORD_INTERACTIVE_CLI),
      password: keystorePassword,
      passwordFile: parseEnvPath(env.ULX_LOCALCHAIN_PASSWORD_FILE),
    },
  };
}

function parseAddress(address: string, type: string): string {
  if (!address) return address;
  try {
    addressValidation.parse(address);
    return address;
  } catch (error) {
    throw new Error(
      `Invalid Address "${address}" provided to the ${type} environment variable. (Addresses are ss58 encoded and start with "5").`,
    );
  }
}

function parseIdentity(identity: string, type: string): string {
  if (!identity) return identity;
  try {
    identityValidation.parse(identity);
    return identity;
  } catch (error) {
    throw new Error(
      `Invalid Identity "${identity}" provided to the ${type} environment variable. (Identities are Bech32m encoded and start with "id1").`,
    );
  }
}

export function parseIdentities(identities: string, type: string): string[] {
  if (Array.isArray(identities)) return identities.map(x => parseIdentity(x, type));

  if (!identities) return [];
  const identityList = identities
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
  for (const identity of identityList) {
    parseIdentity(identity, type);
  }
  return identityList;
}
