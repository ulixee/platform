import * as Path from 'path';
import { getCacheDirectory } from '@ulixee/commons/lib/dirUtils';
import { addressValidation, identityValidation } from '@ulixee/specification/common';
import Identity from '@ulixee/crypto/lib/Identity';

export default {
  databoxesDir:
    process.env.ULX_DATABOX_DIR ?? Path.join(getCacheDirectory(), 'ulixee', 'databoxes'),
  // list of identities who can upload to this server [@ulixee/crypto/lib/Identity.bech32]
  uploaderIdentities: parseIdentities(
    process.env.ULX_DBX_UPLOADER_IDENTITIES,
    'Uploader Identities',
  ),
  paymentAddress: parseAddress(process.env.ULX_PAYMENT_ADDRESS),
  giftCardAddress: parseAddress(process.env.ULX_GIFT_CARD_ADDRESS),
  computePricePerKb: parseEnvInt(process.env.ULX_PRICE_PER_KB),
  approvedSidechains: [],
  defaultSidechainHost: process.env.ULX_SIDECHAIN_HOST,
  defaultSidechainRootIdentity: process.env.ULX_SIDECHAIN_IDENTITY,
  identityWithSidechain: loadIdentity(process.env.ULX_IDENTITY_PATH, process.env.ULX_IDENTITY_PASSPHRASE),
};

function loadIdentity(path: string, keyPassphrase: string): Identity | null {
  if (!path) return null;
  return Identity.loadFromFile(path, { keyPassphrase })
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

function parseEnvInt(value: string): number | null {
  if (!value) return null;
  return parseInt(value, 10);
}
