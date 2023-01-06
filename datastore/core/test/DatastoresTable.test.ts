import DatastoresDb from '../lib/DatastoresDb';

test('it can save a datastore manifest', () => {
  const db = new DatastoresDb(process.env.ULX_DATA_DIR ?? '.');
  db.datastores.save({
    versionTimestamp: Date.now(),
    scriptHash: 'scr1',
    scriptEntrypoint: 'script/index.js',
    linkedVersions: [],
    functionsByName: {
      default: {
        prices: [
          {
            perQuery: 100,
          },
        ],
      },
    },
    coreVersion: '2.0.0-alpha.1',
    versionHash: 'abc',
  });

  expect(db.datastores.getByVersionHash('abc')).toEqual({
    giftCardIssuerIdentity: undefined,
    paymentAddress: undefined,
    schemaInterface: undefined,
    scriptEntrypoint: 'script/index.js',
    scriptHash: 'scr1',
    coreVersion: '2.0.0-alpha.1',
    functionsByName: {
      default: {
        corePlugins: {},
        prices: [
          {
            perQuery: 100,
            minimum: 100,
            addOns: { perKb: 0 },
          },
        ],
      },
    },
    versionHash: 'abc',
    versionTimestamp: expect.any(Number),
    storedDate: expect.any(Number),
  });
});
