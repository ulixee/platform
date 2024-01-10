/// <reference types="node" />
/// <reference types="node" />
import ISecureKadRecord from '@ulixee/platform-specification/types/ISecureKadRecord';
import { KeyObject } from 'crypto';
export interface IKadRecord extends ISecureKadRecord {
}
/**
 * This is a secure kad record. The key is a public key, and the value should only be accepted if signed by the key.
 */
export default class KadRecord {
    static verify(key: Buffer, record: IKadRecord): void;
    static create(privateKey: KeyObject, value: any, timestamp: number): {
        key: Buffer;
        record: IKadRecord;
    };
}
