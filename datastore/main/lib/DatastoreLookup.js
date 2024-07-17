"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataTLD = void 0;
const TimedCache_1 = require("@ulixee/commons/lib/TimedCache");
const utils_1 = require("@ulixee/commons/lib/utils");
const localchain_1 = require("@ulixee/localchain");
Object.defineProperty(exports, "DataTLD", { enumerable: true, get: function () { return localchain_1.DataTLD; } });
const datastoreIdValidation_1 = require("@ulixee/platform-specification/types/datastoreIdValidation");
const semverValidation_1 = require("@ulixee/platform-specification/types/semverValidation");
const net = require("node:net");
/**
 * Singleton that will track payments for each escrow for a datastore
 */
class DatastoreLookup {
    constructor(mainchainClient) {
        this.mainchainClient = mainchainClient;
        this.zoneRecordByDomain = {};
        (0, utils_1.bindFunctions)(this);
    }
    async getHostInfo(datastoreUrl) {
        const url = (0, utils_1.toUrl)(datastoreUrl);
        const ipHost = DatastoreLookup.parseDatastoreIpHost(url);
        if (ipHost)
            return ipHost;
        // ulx://delta.Flights/@v1.5.0
        const version = url.pathname.split('@v').pop();
        return await this.lookupDatastoreDomain(url.host, version);
    }
    async lookupDatastoreDomain(domain, version) {
        let zoneRecord = this.zoneRecordByDomain[domain]?.value;
        if (!zoneRecord) {
            if (!this.mainchainClient)
                throw new Error('Unable to lookup a datastore in the mainchain. Please connect a mainchainClient');
            const parsed = DatastoreLookup.readDomain(domain);
            const zone = await this.mainchainClient.getDataDomainZoneRecord(parsed.domainName, parsed.topLevelDomain);
            this.zoneRecordByDomain[domain] ??= new TimedCache_1.default(24 * 60 * 60e3);
            this.zoneRecordByDomain[domain].value = {
                ...zone,
                domain,
            };
            zoneRecord = this.zoneRecordByDomain[domain].value;
        }
        const versionHost = zoneRecord.versions[version];
        if (!versionHost)
            throw new Error('Version not found');
        return {
            datastoreId: versionHost.datastoreId,
            host: versionHost.host,
            version,
            domain,
        };
    }
    static readDomain(domain) {
        const [domainName, tldStr] = domain.split('.');
        const tld = DatastoreLookup.parseTld(tldStr);
        if (!tld)
            throw new Error(`Unknown domain top level domain ${tldStr}`);
        return { domainName, topLevelDomain: tld };
    }
    static parseTld(tld) {
        return localchain_1.DataTLD[tld.toLowerCase()] ?? localchain_1.DataTLD[tld[0].toUpperCase() + tld.slice(1)];
    }
    static parseDatastoreIpHost(url) {
        if (url.hostname === 'localhost' || net.isIP(url.hostname)) {
            const urlParts = url.pathname.split('/');
            let id;
            let datastoreVersion;
            for (let i = 0; i < urlParts.length; i += 1) {
                if (urlParts[i].includes('@v')) {
                    [id, datastoreVersion] = urlParts[i].split('@v');
                    break;
                }
            }
            const version = datastoreVersion?.match(semverValidation_1.semverRegex)?.pop();
            if (!version)
                throw new Error('Invalid version in url');
            const datastoreId = id?.match(datastoreIdValidation_1.datastoreRegex)?.pop();
            if (!datastoreId)
                throw new Error('Invalid datastoreId in url');
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
exports.default = DatastoreLookup;
//# sourceMappingURL=DatastoreLookup.js.map