import DatastoreLookup from '@ulixee/datastore/lib/DatastoreLookup';
import { DomainStore, DomainTopLevel } from '@argonprotocol/localchain';

test('can properly encode a domain', async () => {
  expect(DomainStore.parse('Somewhere.analytics')).toEqual({
    name: 'somewhere',
    topLevel: DomainTopLevel.Analytics,
  });
  expect(DomainStore.getHash('somewhere.analytics')).toEqual(
    DomainStore.getHash('Somewhere.Analytics'),
  );
});

test('throws an error for invalid domains', async () => {
  expect(DatastoreLookup.parseTld('not-a-real-tld')).toBe(undefined);
  expect(() => DomainStore.parse('somewhere.not-a-real-tld')).toThrow('Invalid top_level');
});
