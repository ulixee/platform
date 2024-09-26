import TimedCache from '@ulixee/commons/lib/TimedCache';
import { bindFunctions, toUrl } from '@ulixee/commons/lib/utils';
import { ChainIdentity, Domain, DomainTopLevel, ZoneRecord } from '@argonprotocol/localchain';
import { datastoreRegex } from '@ulixee/platform-specification/types/datastoreIdValidation';
import { semverRegex } from '@ulixee/platform-specification/types/semverValidation';
import * as net from 'node:net';
import IDatastoreHostLookup, { IDatastoreHost } from '../interfaces/IDatastoreHostLookup';

export { DomainTopLevel };

export interface IZoneRecordLookup {
  getDomainZoneRecord(domainName: string, tld: DomainTopLevel): Promise<ZoneRecord>;
  getChainIdentity(): Promise<ChainIdentity>;
}
/**
 * Singleton that will track payments for each channelHold for a datastore
 */
export default class DatastoreLookup implements IDatastoreHostLookup {
  public readonly zoneRecordByDomain: {
    [domain: string]: TimedCache<ZoneRecord & { domain: string }>;
  } = {};

  private chainIdentity: Promise<ChainIdentity>;

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

  public async validatePayment(paymentInfo: {
    recipient?: { address?: string; notaryId?: number };
    domain?: string;
  }): Promise<void> {
    if (paymentInfo.domain && paymentInfo.recipient) {
      const zoneRecord = await this.lookupDatastoreDomain(paymentInfo.domain, 'any');
      if (zoneRecord) {
        if (zoneRecord.payment.notaryId !== paymentInfo.recipient.notaryId) {
          throw new Error('Payment notaryId does not match Domain record');
        }
        if (zoneRecord.payment.address !== paymentInfo.recipient.address) {
          throw new Error('Payment address does not match Domain record');
        }
      }
    }
  }

  public async lookupDatastoreDomain(
    domain: string,
    version: string | 'any',
  ): Promise<IDatastoreHost> {
    let zoneRecord = this.zoneRecordByDomain[domain]?.value;
    if (!zoneRecord) {
      if (!this.mainchainClient)
        throw new Error(
          'Unable to lookup a datastore in the mainchain. Please connect a mainchainClient',
        );
      const parsed = DatastoreLookup.readDomain(domain);
      const zone = await this.mainchainClient.getDomainZoneRecord(parsed.name, parsed.topLevel);

      if (!zone) throw new Error(`Zone record for Domain (${domain}) not found`);

      this.zoneRecordByDomain[domain] ??= new TimedCache(24 * 60 * 60e3);
      this.zoneRecordByDomain[domain].value = {
        ...zone,
        domain,
      };
      zoneRecord = this.zoneRecordByDomain[domain].value;
    }

    let versionHost = zoneRecord.versions[version];
    if (!versionHost && version === 'any') {
      versionHost = Object.values(zoneRecord.versions)[0];
    }

    if (!versionHost) throw new Error('Version not found');

    this.chainIdentity ??= this.mainchainClient.getChainIdentity();
    const chainIdentity = await this.chainIdentity;
    return {
      datastoreId: versionHost.datastoreId,
      host: versionHost.host,
      version,
      domain,
      payment: {
        address: zoneRecord.paymentAddress,
        notaryId: zoneRecord.notaryId,
        ...chainIdentity,
      },
    };
  }

  public static readDomain(domain: string): Domain {
    const [name, tldStr] = domain.split('.');
    const tld = DatastoreLookup.parseTld(tldStr);
    if (!tld) throw new Error(`Unknown domain top level domain ${tldStr}`);
    return { name, topLevel: tld };
  }

  public static parseTld(tld: string): DomainTopLevel {
    return DomainTopLevel[tld.toLowerCase()] ?? DomainTopLevel[tld[0].toUpperCase() + tld.slice(1)];
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
