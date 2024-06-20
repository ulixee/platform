"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainLookupApiSchema = void 0;
const zod_1 = require("zod");
const datastoreIdValidation_1 = require("../types/datastoreIdValidation");
const semverValidation_1 = require("../types/semverValidation");
exports.DomainLookupApiSchema = {
    'DomainLookup.query': {
        args: zod_1.z.object({
            datastoreUrl: zod_1.z.string().describe('The datastore url'),
        }),
        result: zod_1.z.object({
            datastoreId: datastoreIdValidation_1.datastoreIdValidation,
            version: semverValidation_1.semverValidation,
            host: zod_1.z.string(),
            domain: zod_1.z.string().optional(),
        }),
    },
};
//# sourceMappingURL=DomainLookupApis.js.map