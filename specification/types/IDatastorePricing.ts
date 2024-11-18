import { z } from 'zod';
import { datastoreIdValidation } from './datastoreIdValidation';
import { semverValidation } from './semverValidation';
import { microgonsValidation } from './index';

export const DatastorePricing = z.object({
  basePrice: microgonsValidation.describe('Base price per query.'),
  addOns: z
    .object({
      perKb: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Optional add-on price per kilobyte of output data. NOTE: under construction'),
    })
    .optional(),
  remoteMeta: z
    .object({
      host: z.string().describe('The remote host'),
      datastoreId: datastoreIdValidation,
      datastoreVersion: semverValidation,
      name: z.string().describe('The remote entity name'),
    })
    .optional(),
});
type IDatastorePricing = z.infer<typeof DatastorePricing>;

export default IDatastorePricing;
