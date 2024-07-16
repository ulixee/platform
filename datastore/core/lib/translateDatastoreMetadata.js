"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateStats = void 0;
const PricingManager_1 = require("@ulixee/datastore/lib/PricingManager");
async function translateDatastoreMetadata(datastore, datastoreStats, includeSchemaAsJson) {
    const result = {
        ...datastore,
        stats: datastoreStats.stats,
        crawlersByName: {},
        extractorsByName: {},
        tablesByName: {},
    };
    for (const [name, extractor] of Object.entries(datastore.extractorsByName)) {
        const { prices, schemaAsJson } = extractor;
        const { stats } = datastoreStats.statsByEntityName[name];
        const netBasePrice = PricingManager_1.default.getNetBasePrice(prices);
        result.extractorsByName[name] = {
            description: extractor.description,
            stats,
            netBasePrice,
            priceBreakdown: prices,
            schemaAsJson: includeSchemaAsJson ? schemaAsJson : undefined,
        };
    }
    for (const [name, crawler] of Object.entries(datastore.crawlersByName)) {
        const { prices, schemaAsJson } = crawler;
        const { stats } = datastoreStats.statsByEntityName[name];
        const netBasePrice = PricingManager_1.default.getNetBasePrice(prices);
        result.crawlersByName[name] = {
            description: crawler.description,
            stats,
            netBasePrice,
            priceBreakdown: prices,
            schemaAsJson: includeSchemaAsJson ? schemaAsJson : undefined,
        };
    }
    for (const [name, meta] of Object.entries(datastore.tablesByName)) {
        const { prices } = meta;
        const { stats } = datastoreStats.statsByEntityName[name];
        const netBasePrice = PricingManager_1.default.getNetBasePrice(prices);
        result.tablesByName[name] = {
            description: meta.description,
            stats,
            netBasePrice,
            priceBreakdown: prices,
            schemaAsJson: includeSchemaAsJson ? meta.schemaAsJson : undefined,
        };
    }
    return result;
}
exports.default = translateDatastoreMetadata;
function translateStats(stats) {
    stats ??= {};
    return {
        queries: stats.runs ?? 0,
        errors: stats.errors ?? 0,
        totalSpend: stats.totalSpend ?? 0,
        totalCreditSpend: stats.totalCreditSpend ?? 0,
        averageMilliseconds: stats.averageMilliseconds ?? 0,
        maxMilliseconds: stats.maxMilliseconds ?? 0,
        averageTotalPricePerQuery: stats.averagePrice ?? 0,
        maxPricePerQuery: stats.maxPrice ?? 0,
        averageBytesPerQuery: stats.averageBytes ?? 0,
        maxBytesPerQuery: stats.maxBytes ?? 0,
    };
}
exports.translateStats = translateStats;
//# sourceMappingURL=translateDatastoreMetadata.js.map