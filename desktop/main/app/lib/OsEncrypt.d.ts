/// <reference types="node" />
export default class OsEncrypt {
    static encrypt(body: string, password: string): {
        encryptedText: string;
        iv: Buffer;
        authTag: Buffer;
    };
    static decrypt(encryptedText: string, iv: Buffer, authTag: Buffer, password: string): string;
}
