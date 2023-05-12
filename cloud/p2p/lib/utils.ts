import type { PeerId } from '@libp2p/interface-peer-id';
import Identity from '@ulixee/crypto/lib/Identity';
import { import_ } from '@brillout/import';
import Ed25519 from '@ulixee/crypto/lib/Ed25519';
import type { CID } from 'multiformats';
import { Multiaddr } from '@multiformats/multiaddr';

/// IMPORTS TO AVOID ESMODULE ISSUES ///

export async function peerIdFromIdentity(identity: Identity): Promise<PeerId> {
  const { supportedKeys } = await dynamicImport<typeof import('@libp2p/crypto/keys')>(
    '@libp2p/crypto/keys',
  );
  const keypair = supportedKeys.ed25519.unmarshalEd25519PrivateKey(
    Buffer.concat([
      Ed25519.getPrivateKeyBytes(identity.privateKey),
      Ed25519.getPublicKeyBytes(identity.privateKey),
    ]),
  );
  const { createFromPrivKey } = await dynamicImport<typeof import('@libp2p/peer-id-factory')>(
    '@libp2p/peer-id-factory',
  );
  return await createFromPrivKey(keypair);
}

export async function parseMultiaddrs(multiaddrs: (Multiaddr | string)[]): Promise<Multiaddr[]> {
  const { multiaddr } = await dynamicImport<typeof import('@multiformats/multiaddr')>(
    '@multiformats/multiaddr',
  );
  return multiaddrs.map(x => (typeof x === 'string' ? multiaddr(x) : x));
}

export async function peerIdFromNodeId(nodeId: string): Promise<PeerId> {
  const { peerIdFromString } = await dynamicImport<typeof import('@libp2p/peer-id')>(
    '@libp2p/peer-id',
  );
  return peerIdFromString(nodeId);
}

export async function peerIdFromBuffer(bytes: Buffer): Promise<PeerId> {
  const { peerIdFromBytes } = await dynamicImport<typeof import('@libp2p/peer-id')>(
    '@libp2p/peer-id',
  );
  return peerIdFromBytes(bytes);
}

export async function dynamicImport<T>(id: string): Promise<T> {
  return import_(id) as Promise<T>;
}

export async function base32(data: Uint8Array): Promise<string> {
  const Base32 = await dynamicImport<typeof import('multiformats/bases/base32')>(
    'multiformats/bases/base32',
  );
  return Base32.base32.encode(data).substring(1);
}

export async function decodeBase32(data: string): Promise<Uint8Array> {
  const Base32 = await dynamicImport<typeof import('multiformats/bases/base32')>(
    'multiformats/bases/base32',
  );
  if (!data.startsWith(Base32.base32.prefix)) data = Base32.base32.prefix + data;
  return Base32.base32.decode(data);
}

export async function encodeSha256AsCID(sha256Bytes: Buffer | Uint8Array): Promise<CID> {
  const { CID } = await dynamicImport<typeof import('multiformats')>('multiformats');
  const RawMultiformatCodec = await dynamicImport<typeof import('multiformats/codecs/raw')>(
    'multiformats/codecs/raw',
  );
  const { from } = await dynamicImport<typeof import('multiformats/hashes/hasher')>(
    'multiformats/hashes/hasher',
  );
  const multihash = from({
    name: 'sha2-256',
    code: 0x12,
    encode: () => new Uint8Array(sha256Bytes.buffer),
  });
  return CID.createV1(RawMultiformatCodec.code, await multihash.digest(sha256Bytes));
}

export async function decodeCIDFromBase32(data: string): Promise<CID> {
  const { CID } = await dynamicImport<typeof import('multiformats')>('multiformats');
  const buffer = await decodeBase32(data);
  return CID.decode(buffer);
}
