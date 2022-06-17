import DataboxesDb from '../lib/DataboxesDb';

test('it can save a databox manifest', () => {
  const db = new DataboxesDb(process.env.ULX_DATA_DIR ?? '.');
  db.databoxes.save({
    scriptEntrypoint: 'script/index.js',
    runtimeName: '@ulixee/databox-for-hero',
    runtimeVersion: '2.0.0-alpha.1',
    scriptRollupHash: 'abc',
  });

  expect(db.databoxes.getByHash('abc')).toEqual({
    scriptEntrypoint: 'script/index.js',
    runtimeName: '@ulixee/databox-for-hero',
    runtimeVersion: '2.0.0-alpha.1',
    scriptHash: 'abc',
    storedDate: expect.any(Number)
  });
});
