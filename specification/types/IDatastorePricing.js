"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatastorePricing = void 0;
const zod_1 = require("zod");
const datastoreIdValidation_1 = require("./datastoreIdValidation");
const semverValidation_1 = require("./semverValidation");
exports.DatastorePricing = zod_1.z.object({
    basePrice: zod_1.z.number().int().nonnegative().describe('Base price per query.'),
    addOns: zod_1.z
        .object({
        perKb: zod_1.z
            .number()
            .int()
            .nonnegative()
            .optional()
            .describe('Optional add-on price per kilobyte of output data. NOTE: under construction'),
    })
        .optional(),
    remoteMeta: zod_1.z
        .object({
        host: zod_1.z.string().describe('The remote host'),
        datastoreId: datastoreIdValidation_1.datastoreIdValidation,
        datastoreVersion: semverValidation_1.semverValidation,
        name: zod_1.z.string().describe('The remote entity name'),
    })
        .optional(),
});
//# sourceMappingURL=IDatastorePricing.js.map