import { Keyring } from '@polkadot/keyring';
import { encodeAddress } from '@polkadot/util-crypto';

const Registry = require( '@substrate/ss58-registry');

const keyring = new Keyring();
const address1 = keyring.createFromUri('//Alice').publicKey;
const address2 = keyring.createFromUri('//Bob').publicKey;
const maxSS58AddressPrefixesCount = 16383;
const reservedSS58Formats = new Set<number>();
for (const entry of Registry) {
  reservedSS58Formats.add(entry.prefix);
}

// Find SS58 Address Prefixes that generate an SS58 Address Format that starts with the letter 'e'
// Optionally add a filter to this function if you only want to return those not listed in the
// the SS58 Registry https://github.com/paritytech/ss58-registry/blob/main/ss58-registry.json
function findSS58AddressPrefixes(): [number, string][] {
  const foundSS58AddressPrefixes = [];

  //
  for (let prefix = 0; prefix <= maxSS58AddressPrefixesCount; prefix++) {
    if (!reservedSS58Formats.has(prefix)) {
      const ss58Address1 = encodeAddress(address1, prefix);
      const ss58Address2 = encodeAddress(address2, prefix);

      const lower1 = ss58Address1.toLowerCase().slice(0, 2);
      const lower2 = ss58Address2.toLowerCase().slice(0, 2);
      if (lower1 === process.argv[2] && lower2 === process.argv[2]) {
        foundSS58AddressPrefixes.push([prefix, ss58Address1.slice(0, 2),ss58Address2.slice(0, 2)]);
      }
    }
  }

  return foundSS58AddressPrefixes;
}

const foundSS58AddressPrefixes = findSS58AddressPrefixes();
console.log('count: ', foundSS58AddressPrefixes.length);
console.log('foundSS58AddressPrefixes: ', foundSS58AddressPrefixes);
