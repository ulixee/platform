import { loadEnv, parseEnvBool, parseEnvInt, parseEnvPath } from '@ulixee/commons/lib/envUtils';
import Identity from '@ulixee/crypto/lib/Identity';
import { addressValidation, identityValidation } from '@ulixee/specification/common';

loadEnv(process.cwd());
loadEnv(__dirname);
const env = process.env;
if (env.ULX_DATASTORE_DIR) env.ULX_DATASTORE_DIR = parseEnvPath(env.ULX_DATASTORE_DIR);
if (env.ULX_QUERY_HERO_SESSIONS_DIR)
  env.ULX_QUERY_HERO_SESSIONS_DIR = parseEnvPath(env.ULX_QUERY_HERO_SESSIONS_DIR);
if (env.ULX_IDENTITY_PATH) env.ULX_IDENTITY_PATH = parseEnvPath(env.ULX_IDENTITY_PATH);

export default {
  serverEnvironment: env.ULX_SERVER_ENVIRONMENT,
  datastoresDir: env.ULX_DATASTORE_DIR,
  queryHeroSessionsDir: env.ULX_QUERY_HERO_SESSIONS_DIR,
  replayRegistryHost: env.ULX_REPLAY_REGISTRY_HOST,
  enableSqliteWalMode: env.ULX_ENABLE_SQLITE_WAL,
  // list of identities who can upload to this Cloud [@ulixee/crypto/lib/Identity.bech32]
  cloudAdminIdentities: parseIdentities(env.ULX_CLOUD_ADMIN_IDENTITIES, 'Admin Identities'),
  datastoresMustHaveOwnAdminIdentity: parseEnvBool(env.ULX_DATASTORES_MUST_HAVE_OWN_ADMIN) ?? false,
  paymentAddress: parseAddress(env.ULX_PAYMENT_ADDRESS),
  computePricePerQuery: parseEnvInt(env.ULX_PRICE_PER_QUERY),
  approvedSidechains: [],
  defaultSidechainHost: env.ULX_SIDECHAIN_HOST,
  defaultSidechainRootIdentity: env.ULX_SIDECHAIN_IDENTITY,
  identityWithSidechain: loadIdentity(
    env.ULX_IDENTITY_PEM,
    env.ULX_IDENTITY_PATH,
    env.ULX_IDENTITY_PASSPHRASE,
  ),

  enableGlobalConfigs: parseEnvBool(env.ULX_ENABLE_GLOBAL_CONFIG) ?? true,
  statsTrackerHost: env.ULX_DATASTORE_STATS_HOST,
  datastoreRegistryHost: env.ULX_DATASTORE_REGISTRY_HOST,
  storageEngineHost: env.ULX_STORAGE_ENGINE_HOST,
};

function loadIdentity(identityPEM: string, path: string, keyPassphrase: string): Identity | null {
  if (identityPEM) {
    return Identity.loadFromPem(identityPEM, { keyPassphrase });
  }
  if (!path) return null;
  return Identity.loadFromFile(path, { keyPassphrase });
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

function parseAddress(address: string): string {
  if (!address) return null;
  address = address.trim();
  try {
    addressValidation.parse(address);
  } catch (error) {
    throw new Error(
      `Invalid Payment Address "${address}" provided. (Addresses are Bech32m encoded and start with "ar1").`,
    );
  }
  return address;
}
