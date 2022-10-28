import { addressValidation, identityValidation } from '@ulixee/specification/common';
import Identity from '@ulixee/crypto/lib/Identity';
import { loadEnv, parseEnvInt, parseEnvPath } from '@ulixee/commons/lib/envUtils';

loadEnv(__dirname);
const env = process.env;
if (env.ULX_DATABOX_DIR) env.ULX_DATABOX_DIR = parseEnvPath(env.ULX_DATABOX_DIR);
if (env.ULX_IDENTITY_PATH) env.ULX_IDENTITY_PATH = parseEnvPath(env.ULX_IDENTITY_PATH);

export default {
  databoxesDir: env.ULX_DATABOX_DIR,
  // list of identities who can upload to this Miner [@ulixee/crypto/lib/Identity.bech32]
  uploaderIdentities: parseIdentities(env.ULX_DBX_UPLOADER_IDENTITIES, 'Uploader Identities'),
  paymentAddress: parseAddress(env.ULX_PAYMENT_ADDRESS),
  giftCardAddress: parseAddress(env.ULX_GIFT_CARD_ADDRESS),
  computePricePerKb: parseEnvInt(env.ULX_PRICE_PER_KB),
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

function parseIdentities(identities: string, type: string): string[] {
  if (!identities) return [];
  const identityList = identities
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
  for (const identity of identityList) {
    try {
      identityValidation.parse(identity);
    } catch (error) {
      throw new Error(
        `Invalid Identity "${identity}" provided to the ${type} environment variable. (Identities are Bech32m encoded and start with "id1").`,
      );
    }
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
