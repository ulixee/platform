import DataboxesDb from '../lib/DataboxesDb';

test('it can save a databox manifest', () => {
  const db = new DataboxesDb(process.env.ULX_DATA_DIR ?? '.');
  db.databoxes.save({
    scriptEntrypoint: 'script/index.js',
    databoxModule: '@ulixee/databox-for-hero',
    databoxModuleVersion: '2.0.0-alpha.1',
    scriptRollupHash: 'abc',
  });

  expect(db.databoxes.getByHash('abc')).toEqual({
    scriptEntrypoint: 'script/index.js',
    module: '@ulixee/databox-for-hero',
    moduleVersion: '2.0.0-alpha.1',
    scriptHash: 'abc',
    storedDate: expect.any(Number)
  });
});
