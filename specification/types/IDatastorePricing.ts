import { z } from '@ulixee/specification';
import { datastoreVersionHashValidation } from './datastoreVersionHashValidation';

const DatastorePricing = z.object({
  minimum: z.number().int().nonnegative().optional().describe('Minimum price for this step.'),
  perQuery: z.number().int().nonnegative().describe('Base price per query.'),
  addOns: z
    .object({
      perKb: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Optional add-on price per kilobyte of output data.'),
    })
    .optional(),
});

export const DatastoreRunnerPricing = DatastorePricing.extend({
  remoteMeta: z
    .object({
      host: z.string().describe('The remote host'),
      datastoreVersionHash: datastoreVersionHashValidation,
      runnerName: z.string().describe('The remote runner name'),
    })
    .optional(),
});

export const DatastoreCrawlerPricing = DatastorePricing.extend({
  remoteMeta: z
    .object({
      host: z.string().describe('The remote host'),
      datastoreVersionHash: datastoreVersionHashValidation,
      crawlerName: z.string().describe('The remote crawler name'),
    })
    .optional(),
});

export const DatastoreTablePricing = z.object({
  perQuery: z.number().int().nonnegative().describe('Base price per query.'),
  remoteMeta: z
    .object({
      host: z.string().describe('The remote host'),
      datastoreVersionHash: datastoreVersionHashValidation,
      tableName: z.string().describe('The remote table name'),
    })
    .optional(),
});

type IDatastoreRunnerPricing = z.infer<typeof DatastoreRunnerPricing>;
type IDatastoreCrawlerPricing = z.infer<typeof DatastoreCrawlerPricing>;

export { IDatastoreRunnerPricing, IDatastoreCrawlerPricing };
