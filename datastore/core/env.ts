import { addressValidation, identityValidation } from '@ulixee/specification/common';
import Identity from '@ulixee/crypto/lib/Identity';
import { loadEnv, parseEnvBool, parseEnvInt, parseEnvPath } from '@ulixee/commons/lib/envUtils';

loadEnv(process.cwd());
loadEnv(__dirname);
const env = process.env;
if (env.ULX_DATASTORE_DIR) env.ULX_DATASTORE_DIR = parseEnvPath(env.ULX_DATASTORE_DIR);
if (env.ULX_IDENTITY_PATH) env.ULX_IDENTITY_PATH = parseEnvPath(env.ULX_IDENTITY_PATH);

export default {
  serverEnvironment: env.ULX_SERVER_ENVIRONMENT,
  datastoresDir: env.ULX_DATASTORE_DIR,
  // list of identities who can upload to this Miner [@ulixee/crypto/lib/Identity.bech32]
  serverAdminIdentities: parseIdentities(env.ULX_SERVER_ADMIN_IDENTITIES, 'Admin Identities'),
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

function parseIdentities(identities: string, type: string): string[] {
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
