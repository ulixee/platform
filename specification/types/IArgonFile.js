"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArgonFileSchema = void 0;
const specification_1 = require("@ulixee/specification");
const common_1 = require("@ulixee/specification/common");
exports.ArgonFileSchema = specification_1.z.object({
    credit: specification_1.z
        .object({
        datastoreUrl: specification_1.z.string().url('The connection string to the datastore'),
        microgons: specification_1.z.number().int().positive().describe('The granted number of microgons.'),
    })
        .optional(),
    cash: specification_1.z
        .object({
        centagons: specification_1.z.bigint().describe('The number of centagons'),
        toAddress: common_1.addressValidation
            .optional()
            .describe('An optional exclusive recipient of this cash.'),
    })
        .optional(),
});
//# sourceMappingURL=IArgonFile.js.map