import rollupDatabox from '../lib/rollupDatabox';

test('it should support packaging a typescript project', async () => {
  const bundled = await rollupDatabox(`${__dirname}/assets/typescript/src/index.ts`, {
    dryRun: true,
  });
  // should import helpers.ts, index.ts, lodash-es
  expect(bundled.modules).toHaveLength(3);
  expect(bundled.modules).not.toContain('@ulixee/databox-for-hero');
}, 45e3);

test('it should support packaging an esmodule project', async () => {
  const bundled = await rollupDatabox(`${__dirname}/assets/esmodules/src/index.mjs`, {
    dryRun: true,
  });
  // should import helpers.ts, index.ts, lodash-es
  expect(bundled.modules).toHaveLength(3);
  expect(bundled.modules).not.toContain('@ulixee/databox-for-hero');
}, 45e3);

test('it should support packaging an commonjs project', async () => {
  const bundled = await rollupDatabox(`${__dirname}/assets/commonjs/src/index.js`, {
    dryRun: true,
  });
  // should import helpers.ts, index.ts, lodash-es. Needs a second pass of commonjs exports
  expect(bundled.modules).toHaveLength(6);
  expect(bundled.modules).not.toContain('@ulixee/databox-for-hero');
}, 45e3);

test('it should require a base class to have a default export', async () => {
  await expect(
    rollupDatabox(`${__dirname}/assets/non-default/index.js`, {
      dryRun: true,
    }),
  ).rejects.toThrow('default export');
}, 45e3);
