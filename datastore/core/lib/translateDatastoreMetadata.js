"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateStats = void 0;
const PaymentProcessor_1 = require("./PaymentProcessor");
async function translateDatastoreMetadata(datastore, datastoreStats, context, includeSchemaAsJson) {
    const result = {
        ...datastore,
        stats: datastoreStats.stats,
        crawlersByName: {},
        extractorsByName: {},
        tablesByName: {},
        computePricePerQuery: context.configuration.computePricePerQuery,
    };
    for (const [name, extractor] of Object.entries(datastore.extractorsByName)) {
        const { prices, schemaAsJson } = extractor;
        const { stats } = datastoreStats.statsByEntityName[name];
        const { pricePerQuery, settlementFee } = await PaymentProcessor_1.default.getPrice(prices, context);
        result.extractorsByName[name] = {
            description: extractor.description,
            stats,
            pricePerQuery,
            minimumPrice: pricePerQuery + settlementFee,
            prices,
            schemaAsJson: includeSchemaAsJson ? schemaAsJson : undefined,
        };
    }
    for (const [name, crawler] of Object.entries(datastore.crawlersByName)) {
        const { prices, schemaAsJson } = crawler;
        const { stats } = datastoreStats.statsByEntityName[name];
        const { pricePerQuery, settlementFee } = await PaymentProcessor_1.default.getPrice(prices, context);
        result.crawlersByName[name] = {
            description: crawler.description,
            stats,
            pricePerQuery,
            minimumPrice: pricePerQuery + settlementFee,
            prices,
            schemaAsJson: includeSchemaAsJson ? schemaAsJson : undefined,
        };
    }
    for (const [name, meta] of Object.entries(datastore.tablesByName)) {
        const { prices } = meta;
        const { pricePerQuery, settlementFee } = await PaymentProcessor_1.default.getPrice(prices, context);
        const { stats } = datastoreStats.statsByEntityName[name];
        result.tablesByName[name] = {
            description: meta.description,
            stats,
            pricePerQuery: pricePerQuery + settlementFee,
            prices,
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