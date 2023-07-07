import { concatAsBuffer } from '@ulixee/commons/lib/bufferUtils';
import { CodeError } from '@ulixee/commons/lib/errors';
import { sha256 } from '@ulixee/commons/lib/hashUtils';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import Ed25519 from '@ulixee/crypto/lib/Ed25519';
import { InvalidSignatureError } from '@ulixee/crypto/lib/errors';
import ISecureKadRecord from '@ulixee/platform-specification/types/ISecureKadRecord';
import { KeyObject } from 'crypto';

export interface IKadRecord extends ISecureKadRecord {}

/**
 * This is a secure kad record. The key is a public key, and the value should only be accepted if signed by the key.
 */
export default class KadRecord {
  public static verify(key: Buffer, record: IKadRecord): void {
    if (!key.equals(sha256(record.publicKey))) {
      throw new CodeError('Kad key does not match hash of public key', 'ERR_INVALID_KEY');
    }
    if (record.timestamp > Date.now()) {
      throw new CodeError('Invalid timestamp received for a record', 'ERR_INVALID_KAD_TIMESTAMP');
    }

    const message = sha256(concatAsBuffer(key, record.timestamp, record.value));
    const publicKey = Ed25519.createPublicKeyFromBytes(record.publicKey);
    const isValid = Ed25519.verify(publicKey, message, record.signature);
    if (isValid !== true)
      throw new InvalidSignatureError('The KadRecord signature provided is invalid');
  }

  public static create(
    privateKey: KeyObject,
    value: any,
    timestamp: number,
  ): { key: Buffer; record: IKadRecord } {
    const publicKey = Ed25519.getPublicKeyBytes(privateKey);
    const key = sha256(publicKey);
    const serialized =
      typeof value === 'string' ? value : TypeSerializer.stringify(value, { sortKeys: true });
    const message = sha256(concatAsBuffer(key, timestamp, serialized));
    return {
      key,
      record: {
        publicKey,
        value: serialized,
        timestamp,
        signature: Ed25519.sign(privateKey, message),
      },
    };
  }
}
