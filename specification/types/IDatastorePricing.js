"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatastoreTablePricing = exports.DatastoreCrawlerPricing = exports.DatastoreExtractorPricing = void 0;
const specification_1 = require("@ulixee/specification");
const datastoreIdValidation_1 = require("./datastoreIdValidation");
const semverValidation_1 = require("./semverValidation");
const DatastorePricing = specification_1.z.object({
    minimum: specification_1.z.number().int().nonnegative().optional().describe('Minimum price for this step.'),
    perQuery: specification_1.z.number().int().nonnegative().describe('Base price per query.'),
    addOns: specification_1.z
        .object({
        perKb: specification_1.z
            .number()
            .int()
            .nonnegative()
            .optional()
            .describe('Optional add-on price per kilobyte of output data.'),
    })
        .optional(),
});
exports.DatastoreExtractorPricing = DatastorePricing.extend({
    remoteMeta: specification_1.z
        .object({
        host: specification_1.z.string().describe('The remote host'),
        datastoreId: datastoreIdValidation_1.datastoreIdValidation,
        datastoreVersion: semverValidation_1.semverValidation,
        extractorName: specification_1.z.string().describe('The remote extractor name'),
    })
        .optional(),
});
exports.DatastoreCrawlerPricing = DatastorePricing.extend({
    remoteMeta: specification_1.z
        .object({
        host: specification_1.z.string().describe('The remote host'),
        datastoreId: datastoreIdValidation_1.datastoreIdValidation,
        datastoreVersion: semverValidation_1.semverValidation,
        crawlerName: specification_1.z.string().describe('The remote crawler name'),
    })
        .optional(),
});
exports.DatastoreTablePricing = specification_1.z.object({
    perQuery: specification_1.z.number().int().nonnegative().describe('Base price per query.'),
    remoteMeta: specification_1.z
        .object({
        host: specification_1.z.string().describe('The remote host'),
        datastoreId: datastoreIdValidation_1.datastoreIdValidation,
        datastoreVersion: semverValidation_1.semverValidation,
        tableName: specification_1.z.string().describe('The remote table name'),
    })
        .optional(),
});
//# sourceMappingURL=IDatastorePricing.js.map