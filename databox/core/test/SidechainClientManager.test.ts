import Identity from '@ulixee/crypto/lib/Identity';
import { concatAsBuffer, encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import { sha3 } from '@ulixee/commons/lib/hashUtils';
import SidechainClient from '@ulixee/sidechain';
import { IBlockSettings } from '@ulixee/specification';
import ISidechainSettingsApis from '@ulixee/specification/sidechain/SidechainSettingsApis';
import SidechainClientManager from '../lib/SidechainClientManager';

test('should be able to specify which sidechain to use', async () => {
  const identity = Identity.createSync();
  const manager = new SidechainClientManager({
    identityWithSidechain: identity,
    approvedSidechains: [{ rootIdentity: identity.bech32, url: 'http://localhost:1337' }],
    defaultSidechainHost: 'http://localhost:1337',
    defaultSidechainRootIdentity: identity.bech32,
  });
  await expect(manager.withIdentity(identity.bech32)).resolves.toBeTruthy();
});

test('should check that micronotes come from trusted sidechains', async () => {
  const identity = Identity.createSync();
  const manager = new SidechainClientManager({
    approvedSidechains: [{ rootIdentity: identity.bech32, url: '' }],
    defaultSidechainHost: 'http://localhost:1337',
    defaultSidechainRootIdentity: identity.bech32,
  });
  await expect(
    manager.withIdentity(encodeBuffer(sha3('NewNoteIdentity'), 'id')),
  ).rejects.toThrowError('not approved');
});

test('can update the approved sidechain list from the main sidechain', async () => {
  const sidechainIdentity = Identity.createSync();
  const sidechainOriginalRootIdentity = Identity.createSync();
  const manager = new SidechainClientManager({
    identityWithSidechain: Identity.createSync(),
    defaultSidechainHost: 'http://localhost:1337',
    defaultSidechainRootIdentity: sidechainOriginalRootIdentity.bech32,
  });

  jest
    .spyOn<any, any>(SidechainClient.prototype, 'sendRequest')
    .mockImplementationOnce(({ command, args }) => {
      if (command === 'Sidechain.settings') {
        return {
          // built to handle more than one key if we need to rotate one out
          rootIdentities: [sidechainOriginalRootIdentity.bech32],
          identityProofSignatures: [
            sidechainOriginalRootIdentity.sign(
              sha3(concatAsBuffer(command, (args as any)?.identity)),
            ),
          ],
          latestBlockSettings: {
            height: 0,
            sidechains: [
              { rootIdentity: sidechainOriginalRootIdentity.bech32, url: 'http://localhost:1337' },
              { rootIdentity: sidechainIdentity.bech32, url: 'https://somewherenew.com' },
            ],
          } as IBlockSettings,
          batchDurationMinutes: 60 * 60e3 * 8,
          settlementFeeMicrogons: 5,
          version: '1.0.0',
        } as ISidechainSettingsApis['Sidechain.settings']['result'];
      }
    });
  await expect(manager.withIdentity(sidechainIdentity.bech32)).resolves.toBeTruthy();
});
