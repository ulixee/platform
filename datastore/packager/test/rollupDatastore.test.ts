import rollupDatastore from '../lib/rollupDatastore';

test('it should support packaging a typescript project', async () => {
  const bundled = await rollupDatastore(`${__dirname}/assets/typescript/src/index.ts`, {
    dryRun: true,
  });
  // should import helpers.ts, index.ts, lodash-es
  expect(bundled.modules).toHaveLength(3);
  expect(bundled.modules).not.toContain('@ulixee/datastore-plugins-hero');
}, 45e3);

test('it should support packaging an esmodule project', async () => {
  const bundled = await rollupDatastore(`${__dirname}/assets/esmodules/src/index.mjs`, {
    dryRun: true,
  });
  // should import helpers.ts, index.ts, lodash-es
  expect(bundled.modules).toHaveLength(3);
  expect(bundled.modules).not.toContain('@ulixee/datastore-plugins-hero');
}, 45e3);

test('it should support packaging an commonjs project', async () => {
  const bundled = await rollupDatastore(`${__dirname}/assets/commonjs/src/index.js`, {
    dryRun: true,
  });
  // should import helpers.ts, index.ts, lodash-es. Needs a second pass of commonjs exports
  expect(bundled.modules).toHaveLength(6);
  expect(bundled.modules).not.toContain('@ulixee/datastore-plugins-hero');
}, 45e3);

test('it should support packaging a prebuilt project', async () => {
  const bundled = await rollupDatastore(`${__dirname}/assets/prebuilt/src/index.js`, {
    dryRun: true,
  });
  // should import helpers.ts, index.ts, lodash-es. Needs a second pass of commonjs exports
  expect(bundled.modules).toHaveLength(7);
  expect(bundled.modules).not.toContain('@ulixee/datastore-plugins-hero');
}, 45e3);
