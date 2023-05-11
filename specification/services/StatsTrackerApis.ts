import { z } from '@ulixee/specification';
import { IZodHandlers, IZodSchemaToApiTypes } from '@ulixee/specification/utils/IZodApi';
import { micronoteIdValidation, micronoteTokenValidation } from '@ulixee/specification/common';
import { datastoreVersionHashValidation } from '../types/datastoreVersionHashValidation';
import { DatastoreStatsSchema } from '../types/IDatastoreStats';

export const StatsTrackerApiSchemas = {
  'StatsTracker.get': {
    args: z.object({
      versionHash: datastoreVersionHashValidation,
    }),
    result: z.object({
      stats: DatastoreStatsSchema,
      statsByEntityName: z.record(z.string().describe('Entity name'), DatastoreStatsSchema),
    }),
  },
  'StatsTracker.recordEntityStats': {
    args: z.object({
      versionHash: datastoreVersionHashValidation,
      entityName: z.string().optional(),
      error: z.instanceof(Error).optional(),
      bytes: z.number().int(),
      microgons: micronoteTokenValidation,
      milliseconds: z.number().int(),
      didUseCredits: z.boolean(),
    }),
    result: z.object({
      success: z.boolean(),
    }),
  },
  'StatsTracker.recordQuery': {
    args: z.object({
      versionHash: datastoreVersionHashValidation,
      id: z.string().describe('Query Id'),
      query: z.string().describe('The sql query run'),
      startTime: z.number().describe('Date epoch millis'),
      input: z.any(),
      outputs: z.any().array(),
      error: z.instanceof(Error).optional(),
      micronoteId: micronoteIdValidation.optional(),
      creditId: z.string().describe('Any credit spent on this item'),
      affiliateId: z.string().describe('An affiliate id used for this query'),
      heroSessionIds: z
        .string()
        .array()
        .optional()
        .describe('Any hero session ids used for this query'),
      bytes: z.number().int(),
      microgons: micronoteTokenValidation,
      milliseconds: z.number().int(),
    }),
    result: z.object({
      success: z.boolean(),
    }),
  },
};

export type IStatsTrackerApiTypes = IZodSchemaToApiTypes<typeof StatsTrackerApiSchemas>;
export type IStatsTrackerApis = IZodHandlers<typeof StatsTrackerApiSchemas>;

export default IStatsTrackerApiTypes;
