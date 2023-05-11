import { z } from '@ulixee/specification';
import { IZodHandlers, IZodSchemaToApiTypes } from '@ulixee/specification/utils/IZodApi';
import { identityValidation, signatureValidation } from '@ulixee/specification/common';
import { DatastoreManifestSchema } from '../types/IDatastoreManifest';
import { datastoreVersionHashValidation } from '../types/datastoreVersionHashValidation';

export const DatastoreManifestWithLatest = DatastoreManifestSchema.extend({
  latestVersionHash: datastoreVersionHashValidation.describe(
    'The newest versionHash of this Datastore.',
  ),
  isStarted: z.boolean().describe('Is the Datastore started. Only relevant in development mode.'),
});

export const DatastoreRegistryApiSchemas = {
  'DatastoreRegistry.list': {
    args: z.object({
      count: z.number().optional().describe('The number of results to return'),
      offset: z.number().optional().describe('The offset of records to return'),
    }),
    result: z.object({
      datastores: DatastoreManifestWithLatest.array(),
    }),
  },
  'DatastoreRegistry.get': {
    args: z.object({
      versionHash: datastoreVersionHashValidation,
    }),
    result: z.object({
      datastore: DatastoreManifestWithLatest,
    }),
  },
  'DatastoreRegistry.getPreviousInstalledVersion': {
    args: z.object({
      versionHash: datastoreVersionHashValidation,
    }),
    result: z.object({
      previousVersionHash: datastoreVersionHashValidation.nullable(),
    }),
  },
  'DatastoreRegistry.getLatestVersion': {
    args: z.object({
      versionHash: datastoreVersionHashValidation,
    }),
    result: z.object({
      latestVersionHash: datastoreVersionHashValidation,
    }),
  },
  'DatastoreRegistry.getLatestVersionForDomain': {
    args: z.object({
      domain: z.string().describe('A Datastore Domain name to lookup the latest version for.'),
    }),
    result: z.object({
      latestVersionHash: datastoreVersionHashValidation,
    }),
  },
  'DatastoreRegistry.downloadDbx': {
    args: z.object({
      versionHash: datastoreVersionHashValidation,
    }),
    result: z.object({
      adminSignature: signatureValidation,
      adminIdentity: identityValidation,
      compressedDbx: z.instanceof(Buffer),
    }),
  },
};

export type IDatastoreRegistryApiTypes = IZodSchemaToApiTypes<typeof DatastoreRegistryApiSchemas>;
export type IDatastoreRegistryApis = IZodHandlers<typeof DatastoreRegistryApiSchemas>;
export type IDatastoreManifestWithLatest = z.infer<typeof DatastoreManifestWithLatest>;

export default IDatastoreRegistryApiTypes;
