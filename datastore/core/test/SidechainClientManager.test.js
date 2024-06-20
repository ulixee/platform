"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Identity_1 = require("@ulixee/crypto/lib/Identity");
const bufferUtils_1 = require("@ulixee/commons/lib/bufferUtils");
const hashUtils_1 = require("@ulixee/commons/lib/hashUtils");
const sidechain_1 = require("@ulixee/sidechain");
const SidechainClientManager_1 = require("../lib/SidechainClientManager");
test('should be able to specify which sidechain to use', async () => {
    const identity = Identity_1.default.createSync();
    const manager = new SidechainClientManager_1.default({
        identityWithSidechain: identity,
        approvedSidechains: [{ rootIdentity: identity.bech32, url: 'http://localhost:1337' }],
        defaultSidechainHost: 'http://localhost:1337',
        defaultSidechainRootIdentity: identity.bech32,
    });
    await expect(manager.withIdentity(identity.bech32)).resolves.toBeTruthy();
});
test('should check that micronotes come from trusted sidechains', async () => {
    const identity = Identity_1.default.createSync();
    const manager = new SidechainClientManager_1.default({
        approvedSidechains: [{ rootIdentity: identity.bech32, url: '' }],
        defaultSidechainHost: 'http://localhost:1337',
        defaultSidechainRootIdentity: identity.bech32,
    });
    await expect(manager.withIdentity((0, bufferUtils_1.encodeBuffer)((0, hashUtils_1.sha256)('NewNoteIdentity'), 'id'))).rejects.toThrow('not approved');
});
test('can update the approved sidechain list from the main sidechain', async () => {
    const sidechainIdentity = Identity_1.default.createSync();
    const sidechainOriginalRootIdentity = Identity_1.default.createSync();
    const manager = new SidechainClientManager_1.default({
        identityWithSidechain: Identity_1.default.createSync(),
        defaultSidechainHost: 'http://localhost:1337',
        defaultSidechainRootIdentity: sidechainOriginalRootIdentity.bech32,
    });
    jest
        .spyOn(sidechain_1.default.prototype, 'sendRequest')
        .mockImplementationOnce(({ command, args }) => {
        if (command === 'Sidechain.settings') {
            return {
                // built to handle more than one key if we need to rotate one out
                rootIdentities: [sidechainOriginalRootIdentity.bech32],
                identityProofSignatures: [
                    sidechainOriginalRootIdentity.sign((0, hashUtils_1.sha256)((0, bufferUtils_1.concatAsBuffer)(command, args?.identity))),
                ],
                latestBlockSettings: {
                    height: 0,
                    sidechains: [
                        { rootIdentity: sidechainOriginalRootIdentity.bech32, url: 'http://localhost:1337' },
                        { rootIdentity: sidechainIdentity.bech32, url: 'https://somewherenew.com' },
                    ],
                },
                batchDurationMinutes: 60 * 60e3 * 8,
                settlementFeeMicrogons: 5,
                version: '1.0.0',
            };
        }
    });
    await expect(manager.withIdentity(sidechainIdentity.bech32)).resolves.toBeTruthy();
});
//# sourceMappingURL=SidechainClientManager.test.js.map