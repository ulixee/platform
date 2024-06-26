import DatastoreLookup from '@ulixee/datastore/lib/DatastoreLookup';
import { DataDomainStore, DataTLD } from '@ulixee/localchain';

test('can properly encode a data domain', async () => {
  expect(DataDomainStore.parse('Somewhere.analytics')).toEqual({
    domainName: 'somewhere',
    topLevelDomain: DataTLD.Analytics,
  });
  expect(DataDomainStore.getHash('somewhere.analytics')).toEqual(
    DataDomainStore.getHash('Somewhere.Analytics'),
  );
});

test('throws an error for invalid domains', async () => {
  expect(DatastoreLookup.parseTld('not-a-real-tld')).toBe(undefined);
  expect(() => DataDomainStore.parse('somewhere.not-a-real-tld')).toThrow('Invalid tld');
});
