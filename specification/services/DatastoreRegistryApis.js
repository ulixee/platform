"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatastoreRegistryApiSchemas = exports.DatastoreListEntry = exports.DatastoreManifestWithLatest = void 0;
const specification_1 = require("@ulixee/specification");
const common_1 = require("@ulixee/specification/common");
const datastoreIdValidation_1 = require("../types/datastoreIdValidation");
const IDatastoreManifest_1 = require("../types/IDatastoreManifest");
const semverValidation_1 = require("../types/semverValidation");
exports.DatastoreManifestWithLatest = IDatastoreManifest_1.DatastoreManifestSchema.extend({
    latestVersion: semverValidation_1.semverValidation.describe('The newest version of this Datastore.'),
    isStarted: specification_1.z.boolean().describe('Is the Datastore started. Only relevant in development mode.'),
});
exports.DatastoreListEntry = IDatastoreManifest_1.DatastoreManifestSchema.pick({
    id: true,
    version: true,
    versionTimestamp: true,
    description: true,
    name: true,
    scriptEntrypoint: true,
}).extend({
    isStarted: specification_1.z.boolean().describe('Is the Datastore started. Only relevant in development mode.'),
});
exports.DatastoreRegistryApiSchemas = {
    'DatastoreRegistry.list': {
        args: specification_1.z.object({
            count: specification_1.z.number().optional().describe('The number of results to return'),
            offset: specification_1.z.number().optional().describe('The offset of records to return'),
        }),
        result: specification_1.z.object({
            datastores: exports.DatastoreListEntry.array(),
            total: specification_1.z.number().positive().int(),
        }),
    },
    'DatastoreRegistry.get': {
        args: specification_1.z.object({
            id: datastoreIdValidation_1.datastoreIdValidation,
            version: semverValidation_1.semverValidation,
        }),
        result: specification_1.z.object({
            datastore: exports.DatastoreManifestWithLatest,
        }),
    },
    'DatastoreRegistry.getVersions': {
        args: specification_1.z.object({
            id: datastoreIdValidation_1.datastoreIdValidation,
        }),
        result: specification_1.z.object({
            versions: specification_1.z
                .object({
                version: semverValidation_1.semverValidation,
                timestamp: specification_1.z.number().positive().int().describe('Millis since the epoch'),
            })
                .array(),
        }),
    },
    'DatastoreRegistry.getLatestVersion': {
        args: specification_1.z.object({
            id: datastoreIdValidation_1.datastoreIdValidation,
        }),
        result: specification_1.z.object({
            latestVersion: semverValidation_1.semverValidation,
        }),
    },
    'DatastoreRegistry.downloadDbx': {
        args: specification_1.z.object({
            id: datastoreIdValidation_1.datastoreIdValidation,
            version: semverValidation_1.semverValidation,
        }),
        result: specification_1.z.object({
            adminSignature: common_1.signatureValidation,
            adminIdentity: common_1.identityValidation,
            compressedDbx: specification_1.z.instanceof(Buffer),
        }),
    },
    'DatastoreRegistry.upload': {
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
};
//# sourceMappingURL=DatastoreRegistryApis.js.map