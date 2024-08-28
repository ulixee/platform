import TimedCache from '@ulixee/commons/lib/TimedCache';
import { bindFunctions, toUrl } from '@ulixee/commons/lib/utils';
import { DataDomain, DataTLD, ZoneRecord } from '@argonprotocol/localchain';
import { datastoreRegex } from '@ulixee/platform-specification/types/datastoreIdValidation';
import { semverRegex } from '@ulixee/platform-specification/types/semverValidation';
import * as net from 'node:net';
import IDatastoreHostLookup, { IDatastoreHost } from '../interfaces/IDatastoreHostLookup';

export { DataTLD };


export interface IZoneRecordLookup {
  getDataDomainZoneRecord(domainName: string, tld: DataTLD): Promise<ZoneRecord>;
}
/**
 * Singleton that will track payments for each escrow for a datastore
 */
export default class DatastoreLookup implements IDatastoreHostLookup {
  public readonly zoneRecordByDomain: {
    [domain: string]: TimedCache<ZoneRecord & { domain: string }>;
  } = {};

  constructor(private mainchainClient: IZoneRecordLookup) {
    bindFunctions(this);
  }

  public async getHostInfo(datastoreUrl: string): Promise<IDatastoreHost> {
    const url = toUrl(datastoreUrl);
    const ipHost = DatastoreLookup.parseDatastoreIpHost(url);
    if (ipHost) return ipHost;

    // ulx://delta.Flights/@v1.5.0
    const version = url.pathname.split('@v').pop();
    return await this.lookupDatastoreDomain(url.host, version);
  }

  public async lookupDatastoreDomain(domain: string, version: string): Promise<IDatastoreHost> {
    let zoneRecord = this.zoneRecordByDomain[domain]?.value;
    if (!zoneRecord) {
      if (!this.mainchainClient)
        throw new Error(
          'Unable to lookup a datastore in the mainchain. Please connect a mainchainClient',
        );
      const parsed = DatastoreLookup.readDomain(domain);
      const zone = await this.mainchainClient.getDataDomainZoneRecord(
        parsed.domainName,
        parsed.topLevelDomain,
      );

      this.zoneRecordByDomain[domain] ??= new TimedCache(24 * 60 * 60e3);
      this.zoneRecordByDomain[domain].value = {
        ...zone,
        domain,
      };
      zoneRecord = this.zoneRecordByDomain[domain].value;
    }

    const versionHost = zoneRecord.versions[version];
    if (!versionHost) throw new Error('Version not found');
    return {
      datastoreId: versionHost.datastoreId,
      host: versionHost.host,
      version,
      domain,
    };
  }

  public static readDomain(domain: string): DataDomain {
    const [domainName, tldStr] = domain.split('.');
    const tld = DatastoreLookup.parseTld(tldStr);
    if (!tld) throw new Error(`Unknown domain top level domain ${tldStr}`);
    return { domainName, topLevelDomain: tld };
  }

  public static parseTld(tld: string): DataTLD {
    return DataTLD[tld.toLowerCase()] ?? DataTLD[tld[0].toUpperCase() + tld.slice(1)];
  }

  public static parseDatastoreIpHost(url: URL): IDatastoreHost {
    if (url.hostname === 'localhost' || net.isIP(url.hostname)) {
      const urlParts = url.pathname.split('/');
      let id: string;
      let datastoreVersion: string;
      for (let i = 0; i < urlParts.length; i += 1) {
        if (urlParts[i].includes('@v')) {
          [id, datastoreVersion] = urlParts[i].split('@v');
          break;
        }
      }
      const version = datastoreVersion?.match(semverRegex)?.pop();
      if (!version) throw new Error('Invalid version in url');

      const datastoreId = id?.match(datastoreRegex)?.pop();
      if (!datastoreId) throw new Error('Invalid datastoreId in url');
      return {
        datastoreId,
        version,
        domain: null,
        host: url.host,
      };
    }
    return null;
  }
}
