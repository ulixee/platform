import PackageRegistry from '../lib/PackageRegistry';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';

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
  const scriptRollupHash = createHash('sha3-256')
    .update(Buffer.from(script))
    .digest('base64');
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
  ).resolves.toBeTruthy();

  const uploaded = registry.getByHash(scriptRollupHash);
  expect(uploaded).toBeTruthy();
  expect(readFileSync(uploaded.path, 'utf8')).toBe(script);
  registry.flush();
});
