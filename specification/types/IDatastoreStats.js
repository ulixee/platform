"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatastoreStatsSchema = void 0;
const specification_1 = require("@ulixee/specification");
const positiveInt = specification_1.z.number().int().positive();
exports.DatastoreStatsSchema = specification_1.z.object({
    queries: positiveInt.describe('Total number of queries'),
    errors: positiveInt.describe('Total number of errors'),
    totalSpend: positiveInt.describe('Total microgons spent.'),
    totalCreditSpend: positiveInt.describe('Total credits spent in microgons (this number is included in totalSpend).'),
    averageBytesPerQuery: positiveInt.describe('Average bytes of output returned per query.'),
    maxBytesPerQuery: positiveInt.describe('The largest byte count seen.'),
    averageMilliseconds: positiveInt.describe('Average milliseconds spent before response.'),
    maxMilliseconds: positiveInt.describe('Max milliseconds spent before response.'),
    averageTotalPricePerQuery: positiveInt.describe('Average total microgons paid for a query.'),
    maxPricePerQuery: positiveInt.describe('The largest total microgon price seen.'),
});
//# sourceMappingURL=IDatastoreStats.js.map