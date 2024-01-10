"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dirUtils_1 = require("@ulixee/commons/lib/dirUtils");
const fileUtils_1 = require("@ulixee/commons/lib/fileUtils");
class CreditsStore {
    static async storeFromUrl(url, microgons) {
        const datastoreURL = new URL(url);
        datastoreURL.protocol = 'ws:';
        const [datastoreId, version] = datastoreURL.pathname.slice(1).split('@v');
        await this.store(datastoreId, version, datastoreURL.host, {
            id: datastoreURL.username,
            secret: datastoreURL.password,
            remainingCredits: microgons,
        });
    }
    static async store(datastoreId, datastoreVersion, host, credits) {
        const allCredits = await this.load();
        const key = `${datastoreId}__${datastoreVersion}`;
        allCredits[key] ??= {};
        allCredits[key][credits.id] = {
            ...credits,
            host,
            allocated: credits.remainingCredits,
        };
        await this.writeToDisk(allCredits);
    }
    static async getPayment(datastoreId, datastoreVersion, microgons) {
        const credits = await this.load();
        const datastoreCredits = credits[`${datastoreId}__${datastoreVersion}`];
        if (!datastoreCredits)
            return;
        for (const [creditId, credit] of Object.entries(datastoreCredits)) {
            if (credit.remainingCredits >= microgons) {
                credit.remainingCredits -= microgons;
                return {
                    credits: { id: creditId, secret: credit.secret },
                    onFinalized: this.finalizePayment.bind(this, microgons, credit),
                };
            }
        }
    }
    static async asList() {
        const allCredits = await this.load();
        const credits = [];
        for (const [key, credit] of Object.entries(allCredits)) {
            const [datastoreId, datastoreVersion] = key.split('__');
            const [creditsId, entry] = Object.entries(credit)[0];
            credits.push({
                datastoreId,
                datastoreVersion,
                host: entry.host,
                remainingBalance: entry.remainingCredits,
                allocated: entry.allocated,
                creditsId,
            });
        }
        return credits;
    }
    static finalizePayment(originalMicrogons, credits, result) {
        if (!result)
            return;
        const fundsToReturn = originalMicrogons - result.microgons;
        if (fundsToReturn && Number.isInteger(fundsToReturn)) {
            credits.remainingCredits += fundsToReturn;
        }
    }
    static async load() {
        this.creditsByDatastore ??= (0, fileUtils_1.readFileAsJson)(this.storePath).catch(() => ({}));
        return (await this.creditsByDatastore) ?? {};
    }
    static writeToDisk(data) {
        return (0, fileUtils_1.safeOverwriteFile)(this.storePath, JSON.stringify(data));
    }
}
exports.default = CreditsStore;
CreditsStore.storePath = `${(0, dirUtils_1.getDataDirectory)()}/ulixee/credits.json`;
//# sourceMappingURL=CreditsStore.js.map