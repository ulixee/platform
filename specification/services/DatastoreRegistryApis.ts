import { z } from '@ulixee/specification';
import { identityValidation, signatureValidation } from '@ulixee/specification/common';
import { IZodHandlers, IZodSchemaToApiTypes } from '@ulixee/specification/utils/IZodApi';
import { datastoreIdValidation } from '../types/datastoreIdValidation';
import { DatastoreManifestSchema } from '../types/IDatastoreManifest';
import { semverValidation } from '../types/semverValidation';

export const DatastoreManifestWithLatest = DatastoreManifestSchema.extend({
  latestVersion: semverValidation.describe('The newest version of this Datastore.'),
  isStarted: z.boolean().describe('Is the Datastore started. Only relevant in development mode.'),
});

export const DatastoreListEntry = DatastoreManifestSchema.pick({
  id: true,
  version: true,
  versionTimestamp: true,
  domain: true,
  description: true,
  name: true,
  scriptEntrypoint: true,
}).extend({
  isStarted: z.boolean().describe('Is the Datastore started. Only relevant in development mode.'),
});

export const DatastoreRegistryApiSchemas = {
  'DatastoreRegistry.list': {
    args: z.object({
      count: z.number().optional().describe('The number of results to return'),
      offset: z.number().optional().describe('The offset of records to return'),
    }),
    result: z.object({
      datastores: DatastoreListEntry.array(),
      total: z.number().positive().int(),
    }),
  },
  'DatastoreRegistry.get': {
    args: z.object({
      id: datastoreIdValidation,
      version: semverValidation,
    }),
    result: z.object({
      datastore: DatastoreManifestWithLatest,
    }),
  },
  'DatastoreRegistry.getVersions': {
    args: z.object({
      id: datastoreIdValidation,
    }),
    result: z.object({
      versions: z
        .object({
          version: semverValidation,
          timestamp: z.number().positive().int().describe('Millis since the epoch'),
        })
        .array(),
    }),
  },
  'DatastoreRegistry.getLatestVersion': {
    args: z.object({
      id: datastoreIdValidation,
    }),
    result: z.object({
      latestVersion: semverValidation,
    }),
  },
  'DatastoreRegistry.getLatestVersionForDomain': {
    args: z.object({
      domain: z
        .string()
        .describe('A Datastore Domain name to lookup the latest datastore version for.'),
    }),
    result: z.object({
      id: datastoreIdValidation,
      version: semverValidation,
    }),
  },
  'DatastoreRegistry.downloadDbx': {
    args: z.object({
      id: datastoreIdValidation,
      version: semverValidation,
    }),
    result: z.object({
      adminSignature: signatureValidation,
      adminIdentity: identityValidation,
      compressedDbx: z.instanceof(Buffer),
    }),
  },
  'DatastoreRegistry.upload': {
    args: z.object({
      compressedDbx: z.instanceof(Buffer).describe('Bytes of a compressed .dbx directory.'),
      adminIdentity: identityValidation
        .optional()
        .describe(
          'If this server is in production mode, an AdminIdentity approved on the Server or Datastore.',
        ),
      adminSignature: signatureValidation
        .optional()
        .describe('A signature from an approved AdminIdentity'),
    }),
    result: z.object({
      success: z.boolean(),
    }),
  },
};

export type IDatastoreRegistryApiTypes = IZodSchemaToApiTypes<typeof DatastoreRegistryApiSchemas>;
export type IDatastoreRegistryApis<TContext = any> = IZodHandlers<
  typeof DatastoreRegistryApiSchemas,
  TContext
>;
export type IDatastoreManifestWithLatest = z.infer<typeof DatastoreManifestWithLatest>;
export type IDatastoreListEntry = z.infer<typeof DatastoreListEntry>;

export default IDatastoreRegistryApiTypes;
