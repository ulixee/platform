"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatastoreManifestSchema = exports.minDate = void 0;
const specification_1 = require("@ulixee/specification");
const common_1 = require("@ulixee/specification/common");
const datastoreIdValidation_1 = require("./datastoreIdValidation");
const IDatastorePricing_1 = require("./IDatastorePricing");
const semverValidation_1 = require("./semverValidation");
exports.minDate = new Date('2022-01-01').getTime();
exports.DatastoreManifestSchema = specification_1.z.object({
    id: datastoreIdValidation_1.datastoreIdValidation.describe('A unique id for the Datastore'),
    version: semverValidation_1.semverValidation,
    name: specification_1.z.string().optional(),
    description: specification_1.z.string().optional(),
    storageEngineHost: specification_1.z
        .string()
        .url('The storage engine host to use for this Datastore. If empty, will default to a local host.')
        .optional(),
    versionTimestamp: specification_1.z.number().int().gt(exports.minDate),
    scriptHash: specification_1.z
        .string()
        .length(62)
        .regex(/^scr1[ac-hj-np-z02-9]{58}/, 'This is not a Datastore scriptHash (Bech32 encoded hash starting with "scr").'),
    adminIdentities: common_1.identityValidation
        .array()
        .describe('Administrators of this Datastore. If none are present, defaults to Administrators on the Cloud.'),
    scriptEntrypoint: specification_1.z.string().describe('A relative path from a project root'),
    coreVersion: specification_1.z.string().describe('Version of the Datastore Core Runtime'),
    schemaInterface: specification_1.z.string().optional().describe('The raw typescript schema for this Datastore'),
    extractorsByName: specification_1.z.record(specification_1.z
        .string()
        .regex(/[a-z][A-Za-z0-9]+/)
        .describe('The Extractor name'), specification_1.z.object({
        description: specification_1.z.string().optional(),
        corePlugins: specification_1.z
            .record(specification_1.z.string())
            .optional()
            .describe('Plugin dependencies required for execution'),
        schemaAsJson: specification_1.z
            .object({
            input: specification_1.z.any().optional(),
            output: specification_1.z.any().optional(),
            inputExamples: specification_1.z.any().optional(),
        })
            .optional()
            .describe('The schema as json.'),
        prices: IDatastorePricing_1.DatastoreExtractorPricing.array()
            .min(1)
            .optional()
            .describe('Price details for a function call. This array will have an entry for each function called in this process. ' +
            'The first entry is the cost of the function packaged in this Datastore.'),
    })),
    crawlersByName: specification_1.z.record(specification_1.z
        .string()
        .regex(/[a-z][A-Za-z0-9]+/)
        .describe('The Crawler name'), specification_1.z.object({
        description: specification_1.z.string().optional(),
        corePlugins: specification_1.z
            .record(specification_1.z.string())
            .optional()
            .describe('Plugin dependencies required for execution'),
        schemaAsJson: specification_1.z
            .object({
            input: specification_1.z.any().optional(),
            output: specification_1.z.any().optional(),
            inputExamples: specification_1.z.any().optional(),
        })
            .optional()
            .describe('The schema as json.'),
        prices: IDatastorePricing_1.DatastoreCrawlerPricing.array()
            .min(1)
            .optional()
            .describe('Price details for a function call. This array will have an entry for each function called in this process. ' +
            'The first entry is the cost of the function packaged in this Datastore.'),
    })),
    tablesByName: specification_1.z.record(specification_1.z
        .string()
        .regex(/[a-z][A-Za-z0-9]+/)
        .describe('The Table name'), specification_1.z.object({
        description: specification_1.z.string().optional(),
        schemaAsJson: specification_1.z.record(specification_1.z.string(), specification_1.z.any()).optional().describe('The schema as json.'),
        prices: specification_1.z
            .object({
            perQuery: specification_1.z.number().int().nonnegative().describe('Base price per query.'),
            remoteMeta: specification_1.z
                .object({
                host: specification_1.z.string().describe('The remote host'),
                datastoreId: datastoreIdValidation_1.datastoreIdValidation,
                datastoreVersion: semverValidation_1.semverValidation,
                tableName: specification_1.z.string().describe('The remote table name'),
            })
                .optional(),
        })
            .array()
            .min(1)
            .optional()
            .describe('Price details for a table call. This array will have an entry for each table called in this process. ' +
            'The first entry is the cost of the table packaged in this Datastore.'),
    })),
    paymentAddress: common_1.addressValidation.optional(),
});
//# sourceMappingURL=IDatastoreManifest.js.map