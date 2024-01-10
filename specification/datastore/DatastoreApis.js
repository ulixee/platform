"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatastoreApiSchemas = exports.EntityStatsSchema = void 0;
const specification_1 = require("@ulixee/specification");
const common_1 = require("@ulixee/specification/common");
const DatastoreRegistryApis_1 = require("../services/DatastoreRegistryApis");
const datastoreIdValidation_1 = require("../types/datastoreIdValidation");
const IDatastoreManifest_1 = require("../types/IDatastoreManifest");
const IDatastorePricing_1 = require("../types/IDatastorePricing");
const IDatastoreStats_1 = require("../types/IDatastoreStats");
const IPayment_1 = require("../types/IPayment");
const semverValidation_1 = require("../types/semverValidation");
const FunctionMetaSchema = specification_1.z.object({
    description: specification_1.z.string().optional(),
    stats: IDatastoreStats_1.DatastoreStatsSchema,
    pricePerQuery: common_1.micronoteTokenValidation.describe('The base price per query.'),
    minimumPrice: common_1.micronoteTokenValidation.describe('Minimum microgons that must be allocated for a query to be accepted.'),
    schemaAsJson: specification_1.z.any().optional().describe('The schema JSON if requested'),
});
exports.EntityStatsSchema = specification_1.z.object({
    name: specification_1.z.string().describe('The entity name'),
    type: specification_1.z.enum(['Table', 'Extractor', 'Crawler']),
    stats: IDatastoreStats_1.DatastoreStatsSchema,
});
exports.DatastoreApiSchemas = {
    'Datastore.upload': {
        args: specification_1.z.object({
            compressedDbx: specification_1.z.instanceof(Buffer).describe('Bytes of a compressed .dbx directory.'),
            adminIdentity: common_1.identityValidation
                .optional()
                .describe('If this server is in production mode, an AdminIdentity approved on the Server or Datastore.'),
            adminSignature: common_1.signatureValidation
                .optional()
                .describe('A signature from an approved AdminIdentity'),
        }),
        result: specification_1.z.object({
            success: specification_1.z.boolean(),
        }),
    },
    'Datastore.download': {
        args: specification_1.z.object({
            id: datastoreIdValidation_1.datastoreIdValidation.describe('The datastore id'),
            version: semverValidation_1.semverValidation,
            requestDate: specification_1.z.date().describe('Date of this request. Must be in last 10 seconds.'),
            adminIdentity: common_1.identityValidation.describe('If this server is in production mode, an AdminIdentity approved on the Server or Datastore.'),
            adminSignature: common_1.signatureValidation.describe('A signature from an approved AdminIdentity'),
        }),
        result: specification_1.z.object({
            adminIdentity: common_1.identityValidation.describe('The admin identity who uploaded this Datastore (used for proof in public network).'),
            adminSignature: common_1.signatureValidation.describe('The signature of the uploader of this Datastore (used for proof in public network).'),
            compressedDbx: specification_1.z.instanceof(Buffer).describe('Bytes of the compressed .dbx directory.'),
        }),
    },
    'Datastore.start': {
        args: specification_1.z.object({
            id: datastoreIdValidation_1.datastoreIdValidation.describe('A temporary datastore id'),
            dbxPath: specification_1.z.string().describe('Path to a local file system Database path.'),
            watch: specification_1.z.boolean().describe('Whether to watch for updates'),
        }),
        result: specification_1.z.object({
            success: specification_1.z.boolean(),
        }),
    },
    'Datastore.creditsBalance': {
        args: specification_1.z.object({
            id: datastoreIdValidation_1.datastoreIdValidation.describe('The datastore id'),
            version: semverValidation_1.semverValidation.describe('The Datastore version to look at credits for.'),
            creditId: specification_1.z.string().describe('CreditId issued by this datastore.'),
        }),
        result: specification_1.z.object({
            issuedCredits: common_1.micronoteTokenValidation.describe('Issued credits balance in microgons.'),
            balance: common_1.micronoteTokenValidation.describe('Remaining credits balance in microgons.'),
        }),
    },
    'Datastore.creditsIssued': {
        args: specification_1.z.object({
            id: datastoreIdValidation_1.datastoreIdValidation.describe('The datastore id'),
            version: semverValidation_1.semverValidation.describe('The Datastore version to look at credits for.'),
        }),
        result: specification_1.z.object({
            issuedCredits: common_1.micronoteTokenValidation.describe('Total credit microgons issued in microgons.'),
            count: common_1.micronoteTokenValidation.describe('Total credits issued in microgons.'),
        }),
    },
    'Datastore.admin': {
        args: specification_1.z.object({
            id: datastoreIdValidation_1.datastoreIdValidation.describe('The datastore id'),
            version: semverValidation_1.semverValidation.describe('The datastore version'),
            adminIdentity: common_1.identityValidation
                .optional()
                .describe('An admin Identity for this Datastore.'),
            adminSignature: common_1.signatureValidation
                .optional()
                .describe('A signature from the admin Identity'),
            adminFunction: specification_1.z.object({
                ownerType: specification_1.z
                    .enum(['table', 'crawler', 'extractor', 'datastore'])
                    .describe('Where to locate the function.'),
                ownerName: specification_1.z
                    .string()
                    .describe('The name of the owning extractor, table or crawler (if applicable).')
                    .optional(),
                functionName: specification_1.z.string().describe('The name of the function'),
            }),
            functionArgs: specification_1.z.any().array().describe('The args to provide to the function.'),
        }),
        result: specification_1.z.any().describe('A flexible result based on the type of api.'),
    },
    'Datastore.meta': {
        args: specification_1.z.object({
            id: datastoreIdValidation_1.datastoreIdValidation.describe('The datastore id'),
            version: semverValidation_1.semverValidation.describe('The datastore version'),
            includeSchemasAsJson: specification_1.z
                .boolean()
                .optional()
                .describe('Include JSON describing the schema for each function'),
        }),
        result: DatastoreRegistryApis_1.DatastoreManifestWithLatest.extend({
            stats: IDatastoreStats_1.DatastoreStatsSchema,
            extractorsByName: specification_1.z.record(specification_1.z.string().describe('The name of the extractor'), FunctionMetaSchema.extend({
                prices: IDatastorePricing_1.DatastoreExtractorPricing.array(),
            })),
            crawlersByName: specification_1.z.record(specification_1.z.string().describe('The name of the crawler'), FunctionMetaSchema.extend({
                prices: IDatastorePricing_1.DatastoreCrawlerPricing.array(),
            })),
            tablesByName: specification_1.z.record(specification_1.z.string().describe('The name of a table'), specification_1.z.object({
                description: specification_1.z.string().optional(),
                stats: IDatastoreStats_1.DatastoreStatsSchema,
                pricePerQuery: common_1.micronoteTokenValidation.describe('The table base price per query.'),
                prices: IDatastorePricing_1.DatastoreTablePricing.array(),
                schemaAsJson: specification_1.z.any().optional().describe('The schema JSON if requested'),
            })),
            schemaInterface: specification_1.z
                .string()
                .optional()
                .describe('A Typescript interface describing input and outputs of Datastore Extractors, and schemas of Datastore Tables'),
            computePricePerQuery: common_1.micronoteTokenValidation.describe('The current server price per query. NOTE: if a server is implementing surge pricing, this amount could vary.'),
        }),
    },
    'Datastore.stream': {
        args: specification_1.z.object({
            id: datastoreIdValidation_1.datastoreIdValidation.describe('The datastore id'),
            version: semverValidation_1.semverValidation.describe('The datastore version'),
            queryId: specification_1.z.string().describe('The id of this query.'),
            name: specification_1.z.string().describe('The name of the table or function'),
            input: specification_1.z.any().optional().describe('Optional input or where parameters'),
            payment: IPayment_1.PaymentSchema.optional().describe('Payment for this request.'),
            affiliateId: specification_1.z
                .string()
                .regex(/aff[a-zA-Z_0-9-]{10}/)
                .optional()
                .describe('A tracking id to attribute payments to source affiliates.'),
            authentication: specification_1.z
                .object({
                identity: common_1.identityValidation,
                signature: common_1.signatureValidation,
                nonce: specification_1.z.string().length(10).describe('A random nonce adding signature noise.'),
            })
                .optional(),
            pricingPreferences: specification_1.z
                .object({
                maxComputePricePerQuery: common_1.micronoteTokenValidation.describe('Maximum price to pay for compute costs per query (NOTE: This only applies to Servers implementing surge pricing).'),
            })
                .optional(),
        }),
        result: specification_1.z.object({
            latestVersion: semverValidation_1.semverValidation,
            metadata: specification_1.z
                .object({
                microgons: common_1.micronoteTokenValidation,
                bytes: specification_1.z.number().int().nonnegative(),
                milliseconds: specification_1.z.number().int().nonnegative(),
            })
                .optional(),
        }),
    },
    'Datastore.query': {
        args: specification_1.z.object({
            id: datastoreIdValidation_1.datastoreIdValidation.describe('The datastore id'),
            version: semverValidation_1.semverValidation,
            queryId: specification_1.z.string().describe('The unique id of this query.'),
            sql: specification_1.z.string().describe('The SQL command(s) you want to run'),
            boundValues: specification_1.z
                .array(specification_1.z.any())
                .optional()
                .describe('An array of values you want to use as bound parameters'),
            affiliateId: specification_1.z
                .string()
                .regex(/aff[a-zA-Z_0-9-]{10}/)
                .optional()
                .describe('A tracking id to attribute payments to source affiliates.'),
            payment: IPayment_1.PaymentSchema.optional().describe('Payment for this request created with an approved Ulixee Sidechain.'),
            authentication: specification_1.z
                .object({
                identity: common_1.identityValidation,
                signature: common_1.signatureValidation,
                nonce: specification_1.z.string().length(10).describe('A random nonce adding signature noise.'),
            })
                .optional(),
            pricingPreferences: specification_1.z
                .object({
                maxComputePricePerQuery: common_1.micronoteTokenValidation.describe('Maximum price to pay for compute costs per query (NOTE: This only applies to Servers implementing surge pricing).'),
            })
                .optional(),
        }),
        result: specification_1.z.object({
            latestVersion: semverValidation_1.semverValidation,
            outputs: specification_1.z.any().array(),
            metadata: specification_1.z
                .object({
                microgons: common_1.micronoteTokenValidation,
                bytes: specification_1.z.number().int().nonnegative(),
                milliseconds: specification_1.z.number().int().nonnegative(),
            })
                .optional(),
        }),
    },
    'Datastore.createStorageEngine': {
        args: specification_1.z.object({
            version: specification_1.z.object({
                compressedDbx: specification_1.z.instanceof(Buffer).describe('Bytes of a compressed .dbx directory.'),
                adminIdentity: common_1.identityValidation
                    .optional()
                    .describe('If this server is in production mode, an AdminIdentity approved on the Server or Datastore.'),
                adminSignature: common_1.signatureValidation
                    .optional()
                    .describe('A signature from an approved AdminIdentity'),
            }),
            previousVersion: specification_1.z
                .object({
                compressedDbx: specification_1.z.instanceof(Buffer).describe('Bytes of a compressed .dbx directory.'),
                adminIdentity: common_1.identityValidation
                    .optional()
                    .describe('If this server is in production mode, an AdminIdentity approved on the Server or Datastore.'),
                adminSignature: common_1.signatureValidation
                    .optional()
                    .describe('A signature from an approved AdminIdentity'),
            })
                .nullable()
                .optional(),
        }),
        result: specification_1.z.object({
            success: specification_1.z.boolean(),
        }),
    },
    'Datastore.queryStorageEngine': {
        args: specification_1.z.object({
            id: datastoreIdValidation_1.datastoreIdValidation,
            version: semverValidation_1.semverValidation.describe('The Datastore version to be queried.'),
            queryId: specification_1.z.string().describe('The unique id of this query.'),
            sql: specification_1.z.string().describe('The SQL command you want to run.'),
            boundValues: specification_1.z
                .array(specification_1.z.any())
                .optional()
                .describe('An array of values you want to use as bound parameters.'),
            virtualEntitiesByName: specification_1.z
                .record(specification_1.z
                .string()
                .describe('Name of the passthrough table, extractor or crawler defined in the Datastore schema.'), specification_1.z.object({
                parameters: specification_1.z
                    .record(specification_1.z.string().describe("Parameter name matching the entity's schema."), specification_1.z
                    .any()
                    .describe('Parameter value as a Javascript type (will be converted by engine).'))
                    .optional()
                    .describe('Parameters to simulate for this virtual function or table'),
                records: specification_1.z
                    .any()
                    .array()
                    .describe('Records to simulate (NOTE: must match the Datastore schema).'),
            }))
                .optional()
                .describe('Virtual passthrough tables, extractors or crawlers being simulated in the sql query.'),
            payment: IPayment_1.PaymentSchema.optional().describe('Payment for this request.'),
            authentication: specification_1.z
                .object({
                identity: common_1.identityValidation,
                signature: common_1.signatureValidation,
                nonce: specification_1.z.string().length(10).describe('A random nonce adding signature noise.'),
            })
                .optional(),
        }),
        result: specification_1.z.object({
            outputs: specification_1.z.any().array(),
            metadata: specification_1.z
                .object({
                microgons: common_1.micronoteTokenValidation,
                bytes: specification_1.z.number().int().nonnegative(),
                milliseconds: specification_1.z.number().int().nonnegative(),
            })
                .optional(),
        }),
    },
    'Datastores.list': {
        args: specification_1.z.object({
            offset: specification_1.z
                .number()
                .optional()
                .describe('Starting offset (inclusive) of results to return')
                .default(0),
        }),
        result: specification_1.z.object({
            datastores: specification_1.z
                .object({
                id: datastoreIdValidation_1.datastoreIdValidation,
                version: semverValidation_1.semverValidation.describe('The latest version'),
                versionTimestamp: specification_1.z.number().int().positive().describe('Millis since epoch'),
                name: specification_1.z.string().optional(),
                description: specification_1.z.string().optional(),
                isStarted: specification_1.z
                    .boolean()
                    .describe('Only relevant in development mode - is this Datastore started.'),
                scriptEntrypoint: specification_1.z.string(),
                stats: IDatastoreStats_1.DatastoreStatsSchema,
            })
                .array(),
            total: specification_1.z.number().describe('Total datastores.'),
            offset: specification_1.z.number().describe('Offset index of result (inclusive).'),
        }),
    },
    'Datastore.versions': {
        args: specification_1.z.object({
            id: datastoreIdValidation_1.datastoreIdValidation.describe('The datastore id'),
        }),
        result: specification_1.z.object({
            versions: specification_1.z
                .object({
                version: semverValidation_1.semverValidation,
                timestamp: specification_1.z
                    .number()
                    .int()
                    .gt(IDatastoreManifest_1.minDate)
                    .refine(x => x <= Date.now())
                    .describe('Millis since the epoch'),
            })
                .array(),
        }),
    },
    'Datastore.stats': {
        args: specification_1.z.object({
            id: datastoreIdValidation_1.datastoreIdValidation.describe('The datastore id'),
        }),
        result: specification_1.z.object({
            byVersion: exports.EntityStatsSchema.array(),
            overall: exports.EntityStatsSchema.array(),
        }),
    },
};
//# sourceMappingURL=DatastoreApis.js.map