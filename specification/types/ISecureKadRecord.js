"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecureKadRecordSchema = void 0;
const specification_1 = require("@ulixee/specification");
exports.SecureKadRecordSchema = specification_1.z.object({
    publicKey: specification_1.z.instanceof(Buffer).refine(x => x.byteLength === 32, 'Public key must be 32 bytes'),
    signature: specification_1.z.instanceof(Buffer).refine(x => x.byteLength === 64, 'Signature must be 64 bytes'),
    timestamp: specification_1.z
        .number()
        .describe('Millis since the epoch. This timestamp is part of the signature and determines "newest" version'),
    value: specification_1.z.string().describe('A TypeSerialized string value containing the payload of this record'),
});
//# sourceMappingURL=ISecureKadRecord.js.map