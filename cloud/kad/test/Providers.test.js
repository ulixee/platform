"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hashUtils_1 = require("@ulixee/commons/lib/hashUtils");
const Identity_1 = require("@ulixee/crypto/lib/Identity");
const Fs = require("fs");
const Path = require("path");
const KadDb_1 = require("../db/KadDb");
const Providers_1 = require("../lib/Providers");
const _helpers_1 = require("./_helpers");
const dbPath = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Providers.test', 'kad.db');
describe('Providers', () => {
    const nodeIds = Array(3)
        .fill(0)
        .map(Identity_1.default.createSync)
        .map(x => x.bech32);
    let providers;
    afterEach(async () => {
        await providers?.stop();
        await Fs.promises.rm(dbPath, { recursive: true }).catch(() => null);
    });
    it('simple add and get of providers', async () => {
        providers = new Providers_1.Providers({
            db: new KadDb_1.default(dbPath),
        });
        const key = (0, hashUtils_1.sha256)(Buffer.from('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n'));
        providers.addProvider(key, nodeIds[0]);
        providers.addProvider(key, nodeIds[1]);
        const provs = await providers.getProviders(key);
        const ids = new Set(provs.map(peerId => peerId.toString()));
        expect(ids.has(nodeIds[0].toString())).toBe(true);
    });
    it('duplicate add of provider is deduped', async () => {
        providers = new Providers_1.Providers({
            db: new KadDb_1.default(dbPath),
        });
        const key = (0, hashUtils_1.sha256)(Buffer.from('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n'));
        providers.addProvider(key, nodeIds[0]);
        providers.addProvider(key, nodeIds[0]);
        providers.addProvider(key, nodeIds[1]);
        providers.addProvider(key, nodeIds[1]);
        providers.addProvider(key, nodeIds[1]);
        const provs = await providers.getProviders(key);
        expect(provs).toHaveLength(2);
        const ids = new Set(provs.map(peerId => peerId.toString()));
        expect(ids.has(nodeIds[0])).toBe(true);
    });
    it('more providers than space in the lru cache', async () => {
        providers = new Providers_1.Providers({
            db: new KadDb_1.default(dbPath),
        }, {
            cacheSize: 10,
        });
        const keys = await Promise.all([...new Array(100)].map(async (i) => {
            return (0, hashUtils_1.sha256)(Buffer.from(`hello ${i}`));
        }));
        await Promise.all(keys.map(async (key) => {
            await providers.addProvider(key, nodeIds[0]);
        }));
        const provs = await Promise.all(keys.map(async (key) => providers.getProviders(key)));
        expect(provs).toHaveLength(100);
        for (const p of provs) {
            expect(p[0].toString()).toBe(nodeIds[0]);
        }
    });
    it('expires', async () => {
        providers = new Providers_1.Providers({
            db: new KadDb_1.default(dbPath),
        }, {
            cleanupInterval: 100,
            provideValidity: 200,
        });
        await providers.start();
        const key = (0, hashUtils_1.sha256)(Buffer.from('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n'));
        providers.addProvider(key, nodeIds[0]);
        providers.addProvider(key, nodeIds[1]);
        const provs = await providers.getProviders(key);
        expect(provs).toHaveLength(2);
        expect(provs[0].toString()).toBe(nodeIds[0].toString());
        expect(provs[1].toString()).toBe(nodeIds[1].toString());
        await (0, _helpers_1.delay)(400);
        const provsAfter = await providers.getProviders(key);
        expect(provsAfter).toHaveLength(0);
        await providers.stop();
    });
});
//# sourceMappingURL=Providers.test.js.map