import { z } from '@ulixee/specification';
import { addressValidation } from '@ulixee/specification/common';

export const ArgonFileSchema = z.object({
  credit: z
    .object({
      datastoreUrl: z.string().url('The connection string to the datastore'),
      microgons: z.number().int().positive().describe('The granted number of microgons.'),
    })
    .optional(),
  cash: z
    .object({
      centagons: z.bigint().describe('The number of centagons'),
      toAddress: addressValidation
        .optional()
        .describe('An optional exclusive recipient of this cash.'),
    })
    .optional(),
});

type IArgonFile = z.infer<typeof ArgonFileSchema>;

export default IArgonFile;
