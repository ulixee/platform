"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DatastoreLookup_1 = require("@ulixee/datastore/lib/DatastoreLookup");
const localchain_1 = require("@ulixee/localchain");
test('can properly encode a data domain', async () => {
    expect(localchain_1.DataDomainStore.parse('Somewhere.analytics')).toEqual({
        domainName: 'somewhere',
        topLevelDomain: localchain_1.DataTLD.Analytics,
    });
    expect(localchain_1.DataDomainStore.getHash('somewhere.analytics')).toEqual(localchain_1.DataDomainStore.getHash('Somewhere.Analytics'));
});
test('throws an error for invalid domains', async () => {
    expect(DatastoreLookup_1.default.parseTld('not-a-real-tld')).toBe(undefined);
    expect(() => localchain_1.DataDomainStore.parse('somewhere.not-a-real-tld')).toThrow('Invalid tld');
});
//# sourceMappingURL=DatastoreLookup.test.js.map