import TimedCache from '@ulixee/commons/lib/TimedCache';
import { DataDomain, DataTLD, ZoneRecord } from '@ulixee/localchain';
import IDatastoreHostLookup, { IDatastoreHost } from '../interfaces/IDatastoreHostLookup';
export { DataTLD };
export interface IZoneRecordLookup {
    getDataDomainZoneRecord(domainName: string, tld: DataTLD): Promise<ZoneRecord>;
}
/**
 * Singleton that will track payments for each escrow for a datastore
 */
export default class DatastoreLookup implements IDatastoreHostLookup {
    private mainchainClient;
    readonly zoneRecordByDomain: {
        [domain: string]: TimedCache<ZoneRecord & {
            domain: string;
        }>;
    };
    constructor(mainchainClient: IZoneRecordLookup);
    getHostInfo(datastoreUrl: string): Promise<IDatastoreHost>;
    lookupDatastoreDomain(domain: string, version: string): Promise<IDatastoreHost>;
    static readDomain(domain: string): DataDomain;
    static parseTld(tld: string): DataTLD;
    static parseDatastoreIpHost(url: URL): IDatastoreHost;
}
