"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsTrackerApiSchemas = void 0;
const specification_1 = require("@ulixee/specification");
const common_1 = require("@ulixee/specification/common");
const DatastoreApis_1 = require("../datastore/DatastoreApis");
const datastoreIdValidation_1 = require("../types/datastoreIdValidation");
const IDatastoreStats_1 = require("../types/IDatastoreStats");
const semverValidation_1 = require("../types/semverValidation");
exports.StatsTrackerApiSchemas = {
    'StatsTracker.getByVersion': {
        args: specification_1.z.object({
            datastoreId: datastoreIdValidation_1.datastoreIdValidation,
            version: semverValidation_1.semverValidation,
        }),
        result: specification_1.z.object({
            stats: IDatastoreStats_1.DatastoreStatsSchema,
            statsByEntityName: specification_1.z.record(specification_1.z.string().describe('Entity name'), DatastoreApis_1.EntityStatsSchema),
        }),
    },
    'StatsTracker.get': {
        args: specification_1.z.object({
            datastoreId: datastoreIdValidation_1.datastoreIdValidation,
        }),
        result: specification_1.z.object({
            stats: IDatastoreStats_1.DatastoreStatsSchema,
            statsByEntityName: specification_1.z.record(specification_1.z.string().describe('Entity name'), DatastoreApis_1.EntityStatsSchema),
        }),
    },
    'StatsTracker.getSummary': {
        args: specification_1.z.object({
            datastoreId: datastoreIdValidation_1.datastoreIdValidation,
        }),
        result: specification_1.z.object({
            stats: IDatastoreStats_1.DatastoreStatsSchema,
        }),
    },
    'StatsTracker.recordEntityStats': {
        args: specification_1.z.object({
            datastoreId: datastoreIdValidation_1.datastoreIdValidation,
            version: semverValidation_1.semverValidation,
            cloudNodeHost: specification_1.z.string().describe('The node hosting this query.'),
            cloudNodeIdentity: specification_1.z
                .string()
                .optional()
                .describe('The network identity of the query running node.'),
            entityName: specification_1.z.string().optional(),
            error: specification_1.z.instanceof(Error).optional(),
            bytes: specification_1.z.number().int(),
            microgons: specification_1.z.number().int().nonnegative(),
            milliseconds: specification_1.z.number().int(),
            didUseCredits: specification_1.z.boolean(),
        }),
        result: specification_1.z.object({
            success: specification_1.z.boolean(),
        }),
    },
    'StatsTracker.recordQuery': {
        args: specification_1.z.object({
            datastoreId: datastoreIdValidation_1.datastoreIdValidation,
            version: semverValidation_1.semverValidation,
            queryId: specification_1.z.string().describe('Query Id'),
            cloudNodeHost: specification_1.z.string().describe('The node hosting this query.'),
            cloudNodeIdentity: specification_1.z
                .string()
                .optional()
                .describe('The network identity of the query running node.'),
            query: specification_1.z.string().describe('The sql query run'),
            startTime: specification_1.z.number().describe('Date epoch millis'),
            input: specification_1.z.any(),
            outputs: specification_1.z.any().array().optional(),
            error: specification_1.z.instanceof(Error).optional(),
            micronoteId: common_1.micronoteIdValidation.optional(),
            creditId: specification_1.z.string().optional().describe('Any credit spent on this item'),
            affiliateId: specification_1.z.string().optional().describe('An affiliate id used for this query'),
            heroSessionIds: specification_1.z
                .string()
                .array()
                .optional()
                .describe('Any hero session ids used for this query'),
            bytes: specification_1.z.number().int(),
            microgons: specification_1.z.number().int().nonnegative(),
            milliseconds: specification_1.z.number().int(),
        }),
        result: specification_1.z.object({
            success: specification_1.z.boolean(),
        }),
    },
};
//# sourceMappingURL=StatsTrackerApis.js.map