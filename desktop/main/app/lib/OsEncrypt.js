"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const crypto = require("crypto");
// Adding this before use just so I remember some of the moving parts.
// SecureStorage puts things in a keychain, so secured to user, but not specific to this app
// Unclear whether this is valuable for encrypting the argon keychain. Probably wise to mimic an ethereum/bitcoin wallet.
class OsEncrypt {
    static encrypt(body, password) {
        const key = electron_1.safeStorage.encryptString(password);
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        let encryptedText = cipher.update(body, 'utf8', 'base64');
        encryptedText += cipher.final('base64');
        return { encryptedText, iv, authTag: cipher.getAuthTag() };
    }
    static decrypt(encryptedText, iv, authTag, password) {
        const key = electron_1.safeStorage.encryptString(password);
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        let result = decipher.update(encryptedText, 'base64', 'utf8');
        result += decipher.final('utf8');
        return result;
    }
}
exports.default = OsEncrypt;
//# sourceMappingURL=OsEncrypt.js.map