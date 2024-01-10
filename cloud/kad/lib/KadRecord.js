"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bufferUtils_1 = require("@ulixee/commons/lib/bufferUtils");
const errors_1 = require("@ulixee/commons/lib/errors");
const hashUtils_1 = require("@ulixee/commons/lib/hashUtils");
const TypeSerializer_1 = require("@ulixee/commons/lib/TypeSerializer");
const Ed25519_1 = require("@ulixee/crypto/lib/Ed25519");
const errors_2 = require("@ulixee/crypto/lib/errors");
/**
 * This is a secure kad record. The key is a public key, and the value should only be accepted if signed by the key.
 */
class KadRecord {
    static verify(key, record) {
        if (!key.equals((0, hashUtils_1.sha256)(record.publicKey))) {
            throw new errors_1.CodeError('Kad key does not match hash of public key', 'ERR_INVALID_KEY');
        }
        if (record.timestamp > Date.now()) {
            throw new errors_1.CodeError('Invalid timestamp received for a record', 'ERR_INVALID_KAD_TIMESTAMP');
        }
        const message = (0, hashUtils_1.sha256)((0, bufferUtils_1.concatAsBuffer)(key, record.timestamp, record.value));
        const publicKey = Ed25519_1.default.createPublicKeyFromBytes(record.publicKey);
        const isValid = Ed25519_1.default.verify(publicKey, message, record.signature);
        if (isValid !== true)
            throw new errors_2.InvalidSignatureError('The KadRecord signature provided is invalid');
    }
    static create(privateKey, value, timestamp) {
        const publicKey = Ed25519_1.default.getPublicKeyBytes(privateKey);
        const key = (0, hashUtils_1.sha256)(publicKey);
        const serialized = typeof value === 'string' ? value : TypeSerializer_1.default.stringify(value, { sortKeys: true });
        const message = (0, hashUtils_1.sha256)((0, bufferUtils_1.concatAsBuffer)(key, timestamp, serialized));
        return {
            key,
            record: {
                publicKey,
                value: serialized,
                timestamp,
                signature: Ed25519_1.default.sign(privateKey, message),
            },
        };
    }
}
exports.default = KadRecord;
//# sourceMappingURL=KadRecord.js.map