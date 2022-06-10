import * as Hasher from '@ulixee/commons/lib/Hasher';
import { readFileSync } from 'fs';
import PackageRegistry from '../lib/PackageRegistry';

test('it should throw an error if the databox module is not installed', async () => {
  const registry = new PackageRegistry(process.env.ULX_DATA_DIR ?? '.');
  await expect(
    registry.save({
      sourceMap: '',
      script: 'function(){}',
      manifest: {
        scriptRollupHash: '1',
        databoxModule: '@ulixee/not-here',
        databoxModuleVersion: '2.0.0-alpha.1',
        scriptEntrypoint: 'here.js',
      },
    }),
  ).rejects.toThrow('not installed');
});

test('it should be able to upload and retrieve the databox', async () => {
  const registry = new PackageRegistry(process.env.ULX_DATA_DIR ?? '.');
  const script = 'function(){}';
  const scriptRollupHash = Hasher.hashDatabox(Buffer.from(script));
  await expect(
    registry.save({
      sourceMap: '',
      script,
      manifest: {
        scriptRollupHash,
        databoxModule: '@ulixee/databox-for-hero',
        databoxModuleVersion: '2.0.0-alpha.1',
        scriptEntrypoint: 'here.js',
      },
    }),
  ).resolves.toBeUndefined();

  const uploaded = await registry.getByHash(scriptRollupHash);
  expect(uploaded).toBeTruthy();
  expect(readFileSync(uploaded.path, 'utf8')).toBe(script);
  registry.flush();
});
