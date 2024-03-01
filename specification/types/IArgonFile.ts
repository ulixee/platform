import { z } from 'zod';
import { BalanceChangeSchema } from './IBalanceChange';
import { semverValidation } from './semverValidation';

export const ArgonFileSchema = z.object({
  version: semverValidation,
  credit: z
    .object({
      datastoreUrl: z.string().url('The connection string to the datastore'),
      microgons: z.number().int().positive().describe('The granted number of microgons.'),
    })
    .optional(),
  send: BalanceChangeSchema.array().optional(),
  request: BalanceChangeSchema.array().optional(),
});

type IArgonFile = z.infer<typeof ArgonFileSchema>;

export default IArgonFile;
